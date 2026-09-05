import Parser from 'web-tree-sitter';
import { CodeSymbol, FileExtractionResult, SymbolKind } from './symbols.js';
import { createParser } from './parserLoader.js';
import { detectLanguage } from './languageDetector.js';

export class AstExtractor {
  // =========================================================================
  // TypeScript / JavaScript AST Visitors
  // =========================================================================

  private extractFunctionDeclaration(
    node: Parser.SyntaxNode,
    filePath: string,
    isExported = false,
    isDefault = false
  ): CodeSymbol | null {
    let name = '';
    let parameters: string[] = [];
    let returnType: string | undefined;
    let isAsync = false;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'async') {
        isAsync = true;
      } else if (child.type === 'identifier') {
        name = child.text;
      } else if (child.type === 'formal_parameters') {
        parameters = this.extractParameters(child);
      } else if (child.type === 'type_annotation') {
        returnType = child.text.replace(/^:\s*/, '');
      }
    }

    if (!name) {
      if (isDefault) name = 'default';
      else return null;
    }

    const paramStr = parameters.join(', ');
    const retStr = returnType ? `: ${returnType}` : '';
    const signature = `${isExported ? 'export ' : ''}${isDefault ? 'default ' : ''}${isAsync ? 'async ' : ''}function ${name}(${paramStr})${retStr}`;

    return {
      name,
      kind: 'function',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      parameters,
      returnType,
      isExported,
      isAsync,
    };
  }

  private extractVariableDeclarations(
    node: Parser.SyntaxNode,
    filePath: string,
    isExported = false
  ): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child || child.type !== 'variable_declarator') continue;

      let name = '';
      let valueNode: Parser.SyntaxNode | null = null;
      let typeAnnotation: string | undefined;

      for (let j = 0; j < child.childCount; j++) {
        const declaratorChild = child.child(j);
        if (!declaratorChild) continue;

        if (declaratorChild.type === 'identifier') {
          name = declaratorChild.text;
        } else if (declaratorChild.type === 'type_annotation') {
          typeAnnotation = declaratorChild.text.replace(/^:\s*/, '');
        } else if (
          declaratorChild.type === 'arrow_function' ||
          declaratorChild.type === 'function_expression' ||
          declaratorChild.type === 'string' ||
          declaratorChild.type === 'number' ||
          declaratorChild.type === 'object' ||
          declaratorChild.type === 'array' ||
          declaratorChild.type === 'call_expression'
        ) {
          valueNode = declaratorChild;
        }
      }

      if (!name) continue;

      if (valueNode && (valueNode.type === 'arrow_function' || valueNode.type === 'function_expression')) {
        let isAsync = false;
        let parameters: string[] = [];
        let returnType = typeAnnotation;

        for (let k = 0; k < valueNode.childCount; k++) {
          const fnChild = valueNode.child(k);
          if (!fnChild) continue;

          if (fnChild.type === 'async') {
            isAsync = true;
          } else if (fnChild.type === 'formal_parameters') {
            parameters = this.extractParameters(fnChild);
          } else if (fnChild.type === 'type_annotation') {
            returnType = fnChild.text.replace(/^:\s*/, '');
          }
        }

        const paramStr = parameters.join(', ');
        const retStr = returnType ? `: ${returnType}` : '';
        const signature = `${isExported ? 'export ' : ''}const ${name} = ${isAsync ? 'async ' : ''}(${paramStr})${retStr} => ...`;

        symbols.push({
          name,
          kind: 'function',
          filePath,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          startColumn: node.startPosition.column + 1,
          endColumn: node.endPosition.column + 1,
          signature,
          parameters,
          returnType,
          isExported,
          isAsync,
        });
      } else {
        const typeStr = typeAnnotation ? `: ${typeAnnotation}` : '';
        const signature = `${isExported ? 'export ' : ''}const ${name}${typeStr}`;

        symbols.push({
          name,
          kind: 'variable',
          filePath,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          startColumn: node.startPosition.column + 1,
          endColumn: node.endPosition.column + 1,
          signature,
          isExported,
        });
      }
    }

    return symbols;
  }

  private extractClassDeclaration(
    node: Parser.SyntaxNode,
    filePath: string,
    isExported = false,
    isDefault = false
  ): { classSymbol: CodeSymbol; methodSymbols: CodeSymbol[] } | null {
    let name = '';
    let heritage = '';
    const methodSymbols: CodeSymbol[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'type_identifier' || child.type === 'identifier') {
        name = child.text;
      } else if (child.type === 'class_heritage') {
        heritage = child.text.trim();
      } else if (child.type === 'class_body') {
        for (let j = 0; j < child.childCount; j++) {
          const bodyChild = child.child(j);
          if (bodyChild && bodyChild.type === 'method_definition') {
            const methodSym = this.extractMethodDefinition(bodyChild, filePath, name || 'AnonymousClass');
            if (methodSym) methodSymbols.push(methodSym);
          }
        }
      }
    }

    if (!name) {
      if (isDefault) name = 'default';
      else return null;
    }

    const signature = `${isExported ? 'export ' : ''}${isDefault ? 'default ' : ''}class ${name}${heritage ? ` ${heritage}` : ''}`;
    const classSymbol: CodeSymbol = {
      name,
      kind: 'class',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      isExported,
    };

    return { classSymbol, methodSymbols };
  }

  private extractMethodDefinition(
    node: Parser.SyntaxNode,
    filePath: string,
    parentClass: string
  ): CodeSymbol | null {
    let name = '';
    let parameters: string[] = [];
    let returnType: string | undefined;
    let accessibility: 'public' | 'private' | 'protected' = 'public';
    let isStatic = false;
    let isAsync = false;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'accessibility_modifier') {
        accessibility = child.text as 'public' | 'private' | 'protected';
      } else if (child.type === 'static') {
        isStatic = true;
      } else if (child.type === 'async') {
        isAsync = true;
      } else if (child.type === 'property_identifier') {
        name = child.text;
      } else if (child.type === 'formal_parameters') {
        parameters = this.extractParameters(child);
      } else if (child.type === 'type_annotation') {
        returnType = child.text.replace(/^:\s*/, '');
      }
    }

    if (!name) return null;

    const paramStr = parameters.join(', ');
    const retStr = returnType ? `: ${returnType}` : '';
    const staticStr = isStatic ? 'static ' : '';
    const asyncStr = isAsync ? 'async ' : '';
    const signature = `${accessibility} ${staticStr}${asyncStr}${name}(${paramStr})${retStr}`;

    return {
      name,
      kind: 'method',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      parameters,
      returnType,
      parentSymbol: parentClass,
      isAsync,
    };
  }

  private extractInterfaceDeclaration(
    node: Parser.SyntaxNode,
    filePath: string,
    isExported = false
  ): CodeSymbol | null {
    let name = '';
    let heritage = '';

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'type_identifier' || child.type === 'identifier') {
        name = child.text;
      } else if (child.type === 'extends_type_clause') {
        heritage = child.text.trim();
      }
    }

    if (!name) return null;

    const signature = `${isExported ? 'export ' : ''}interface ${name}${heritage ? ` ${heritage}` : ''}`;
    return {
      name,
      kind: 'interface',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      isExported,
    };
  }

  private extractTypeAliasDeclaration(
    node: Parser.SyntaxNode,
    filePath: string,
    isExported = false
  ): CodeSymbol | null {
    let name = '';

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'type_identifier') {
        name = child.text;
        break;
      }
    }

    if (!name) return null;

    return {
      name,
      kind: 'type',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature: `${isExported ? 'export ' : ''}type ${name}`,
      isExported,
    };
  }

  private extractEnumDeclaration(
    node: Parser.SyntaxNode,
    filePath: string,
    isExported = false
  ): CodeSymbol | null {
    let name = '';

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'identifier' || child.type === 'type_identifier') {
        name = child.text;
        break;
      }
    }

    if (!name) return null;

    return {
      name,
      kind: 'enum',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature: `${isExported ? 'export ' : ''}enum ${name}`,
      isExported,
    };
  }

  // =========================================================================
  // Python AST Visitors (Step 14)
  // =========================================================================

  private extractPythonFunction(
    node: Parser.SyntaxNode,
    filePath: string,
    parentClass?: string,
    isAsync = false
  ): CodeSymbol | null {
    let name = '';
    let parameters: string[] = [];
    let returnType: string | undefined;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'async') {
        isAsync = true;
      } else if (child.type === 'identifier') {
        name = child.text;
      } else if (child.type === 'parameters') {
        parameters = this.extractPythonParameters(child);
      } else if (child.type === 'type') {
        returnType = child.text;
      }
    }

    if (!name) return null;

    const isMethod = !!parentClass;
    const kind = isMethod ? 'method' : 'function';
    const paramStr = parameters.join(', ');
    const retStr = returnType ? ` -> ${returnType}` : '';
    const signature = `${isAsync ? 'async ' : ''}def ${name}(${paramStr})${retStr}:`;

    return {
      name,
      kind,
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      parameters,
      returnType,
      parentSymbol: parentClass,
      isExported: !name.startsWith('_'),
      isAsync,
    };
  }

  private extractPythonClass(
    node: Parser.SyntaxNode,
    filePath: string
  ): { classSymbol: CodeSymbol; methodSymbols: CodeSymbol[] } | null {
    let name = '';
    let heritage = '';
    const methodSymbols: CodeSymbol[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'identifier') {
        name = child.text;
      } else if (child.type === 'argument_list') {
        heritage = child.text;
      } else if (child.type === 'block') {
        for (let j = 0; j < child.childCount; j++) {
          const bodyChild = child.child(j);
          if (!bodyChild) continue;

          if (bodyChild.type === 'function_definition') {
            const m = this.extractPythonFunction(bodyChild, filePath, name, false);
            if (m) methodSymbols.push(m);
          } else if (bodyChild.type === 'decorated_definition') {
            const fnNode = bodyChild.children.find((c) => c.type === 'function_definition');
            const isAsync = bodyChild.children.some((c) => c.type === 'async');
            if (fnNode) {
              const m = this.extractPythonFunction(fnNode, filePath, name, isAsync);
              if (m) methodSymbols.push(m);
            }
          }
        }
      }
    }

    if (!name) return null;

    const signature = `class ${name}${heritage ? heritage : ''}:`;
    const classSymbol: CodeSymbol = {
      name,
      kind: 'class',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      isExported: !name.startsWith('_'),
    };

    return { classSymbol, methodSymbols };
  }

  private extractPythonParameters(paramsNode: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    for (let i = 0; i < paramsNode.childCount; i++) {
      const child = paramsNode.child(i);
      if (!child) continue;

      if (
        child.type === 'identifier' ||
        child.type === 'typed_parameter' ||
        child.type === 'default_parameter' ||
        child.type === 'typed_default_parameter' ||
        child.type === 'list_splat_pattern' ||
        child.type === 'dictionary_splat_pattern'
      ) {
        params.push(child.text.trim());
      }
    }
    return params;
  }

  // =========================================================================
  // Go AST Visitors (Step 14)
  // =========================================================================

  private extractGoFunction(node: Parser.SyntaxNode, filePath: string): CodeSymbol | null {
    let name = '';
    let parameters: string[] = [];
    let returnType: string | undefined;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'identifier') {
        name = child.text;
      } else if (child.type === 'parameter_list') {
        parameters = this.extractGoParameters(child);
      } else if (child.type === 'type_identifier' || child.type === 'pointer_type' || child.type === 'slice_type') {
        returnType = child.text;
      }
    }

    if (!name) return null;

    const paramStr = parameters.join(', ');
    const retStr = returnType ? ` ${returnType}` : '';
    const isExported = name.charAt(0) === name.charAt(0).toUpperCase() && name.charAt(0) !== '_';
    const signature = `func ${name}(${paramStr})${retStr}`;

    return {
      name,
      kind: 'function',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      parameters,
      returnType,
      isExported,
    };
  }

  private extractGoMethod(node: Parser.SyntaxNode, filePath: string): CodeSymbol | null {
    let name = '';
    let receiver = '';
    let parentSymbol = '';
    let parameters: string[] = [];
    let returnType: string | undefined;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child) continue;

      if (child.type === 'parameter_list') {
        if (!receiver) {
          receiver = child.text; // Receiver is the first parameter list in Go
          for (let j = 0; j < child.childCount; j++) {
            const p = child.child(j);
            if (p && p.type === 'parameter_declaration') {
              const typeChild = p.childForFieldName('type') || p.children.find((c) => c.type === 'pointer_type' || c.type === 'type_identifier');
              if (typeChild) {
                parentSymbol = typeChild.text.replace(/^[\*\s]+/, '').trim();
              }
            }
          }
        } else {
          parameters = this.extractGoParameters(child);
        }
      } else if (child.type === 'field_identifier') {
        name = child.text;
      } else if (child.type === 'type_identifier' || child.type === 'pointer_type' || child.type === 'slice_type') {
        returnType = child.text;
      }
    }

    if (!name) return null;

    const paramStr = parameters.join(', ');
    const retStr = returnType ? ` ${returnType}` : '';
    const isExported = name.charAt(0) === name.charAt(0).toUpperCase();
    const signature = `func ${receiver} ${name}(${paramStr})${retStr}`;

    return {
      name,
      kind: 'method',
      filePath,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      startColumn: node.startPosition.column + 1,
      endColumn: node.endPosition.column + 1,
      signature,
      parameters,
      returnType,
      parentSymbol: parentSymbol || undefined,
      isExported,
    };
  }

  private extractGoTypeDeclaration(node: Parser.SyntaxNode, filePath: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (!child || child.type !== 'type_spec') continue;

      const nameNode = child.childForFieldName('name') || child.children.find((c) => c.type === 'type_identifier');
      const typeNode = child.childForFieldName('type') || child.children.filter((c) => c !== nameNode)[0];

      const name = nameNode ? nameNode.text : '';
      if (!name) continue;

      let kind: SymbolKind = 'type';
      let typeBody = typeNode ? typeNode.text : '';

      if (typeNode) {
        if (typeNode.type === 'struct_type') {
          kind = 'class';
          typeBody = 'struct';
        } else if (typeNode.type === 'interface_type') {
          kind = 'interface';
          typeBody = 'interface';
        }
      }

      const isExported = name.charAt(0) === name.charAt(0).toUpperCase();
      const signature = `type ${name} ${typeBody}`.trim();

      symbols.push({
        name,
        kind,
        filePath,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        startColumn: node.startPosition.column + 1,
        endColumn: node.endPosition.column + 1,
        signature,
        isExported,
      });
    }

    return symbols;
  }

  private extractGoParameters(paramsNode: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    for (let i = 0; i < paramsNode.childCount; i++) {
      const child = paramsNode.child(i);
      if (!child) continue;

      if (child.type === 'parameter_declaration' || child.type === 'variadic_parameter_declaration') {
        params.push(child.text.trim());
      }
    }
    return params;
  }

  private extractParameters(paramsNode: Parser.SyntaxNode): string[] {
    const params: string[] = [];
    for (let i = 0; i < paramsNode.childCount; i++) {
      const child = paramsNode.child(i);
      if (!child) continue;

      if (
        child.type === 'required_parameter' ||
        child.type === 'optional_parameter' ||
        child.type === 'identifier' ||
        child.type === 'rest_pattern'
      ) {
        const paramText = child.text.trim();
        if (paramText && paramText !== '(' && paramText !== ')' && paramText !== ',') {
          params.push(paramText);
        }
      }
    }
    return params;
  }

  /**
   * Traverses the AST and extracts all symbols for TypeScript, JavaScript, Python, and Go.
   */
  public async extract(sourceCode: string, filePath: string): Promise<FileExtractionResult> {
    const startTime = performance.now();
    const lang = detectLanguage(filePath);
    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

    const parser = await createParser(lang, isTsx);
    if (!parser) {
      return {
        filePath,
        symbols: [],
        durationMs: performance.now() - startTime,
      };
    }

    const tree = parser.parse(sourceCode);
    const symbols: CodeSymbol[] = [];

    // =========================================================================
    // Python Traversal
    // =========================================================================
    if (lang === 'python') {
      const visitPython = (node: Parser.SyntaxNode) => {
        if (node.type === 'function_definition') {
          const sym = this.extractPythonFunction(node, filePath, undefined, false);
          if (sym) symbols.push(sym);
        } else if (node.type === 'decorated_definition') {
          const fnNode = node.children.find((c) => c.type === 'function_definition');
          const isAsync = node.children.some((c) => c.type === 'async');
          if (fnNode) {
            const sym = this.extractPythonFunction(fnNode, filePath, undefined, isAsync);
            if (sym) symbols.push(sym);
          }
        } else if (node.type === 'class_definition') {
          const res = this.extractPythonClass(node, filePath);
          if (res) {
            symbols.push(res.classSymbol, ...res.methodSymbols);
          }
        }

        // Recurse (skip class blocks as they're handled in extractPythonClass)
        if (node.type !== 'class_definition') {
          for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child) visitPython(child);
          }
        }
      };

      visitPython(tree.rootNode);
      return { filePath, symbols, durationMs: performance.now() - startTime };
    }

    // =========================================================================
    // Go Traversal
    // =========================================================================
    if (lang === 'go') {
      const visitGo = (node: Parser.SyntaxNode) => {
        if (node.type === 'function_declaration') {
          const sym = this.extractGoFunction(node, filePath);
          if (sym) symbols.push(sym);
        } else if (node.type === 'method_declaration') {
          const sym = this.extractGoMethod(node, filePath);
          if (sym) symbols.push(sym);
        } else if (node.type === 'type_declaration') {
          const syms = this.extractGoTypeDeclaration(node, filePath);
          symbols.push(...syms);
        }

        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child) visitGo(child);
        }
      };

      visitGo(tree.rootNode);
      return { filePath, symbols, durationMs: performance.now() - startTime };
    }

    // =========================================================================
    // TypeScript / JavaScript Traversal
    // =========================================================================
    const visitTs = (node: Parser.SyntaxNode, isExportedContext = false) => {
      if (node.type === 'export_statement') {
        const isDefault = node.children.some((c) => c.type === 'default');

        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (!child) continue;

          if (child.type === 'function_declaration') {
            const sym = this.extractFunctionDeclaration(child, filePath, true, isDefault);
            if (sym) symbols.push(sym);
          } else if (child.type === 'class_declaration') {
            const res = this.extractClassDeclaration(child, filePath, true, isDefault);
            if (res) {
              symbols.push(res.classSymbol, ...res.methodSymbols);
            }
          } else if (child.type === 'interface_declaration') {
            const sym = this.extractInterfaceDeclaration(child, filePath, true);
            if (sym) symbols.push(sym);
          } else if (child.type === 'type_alias_declaration') {
            const sym = this.extractTypeAliasDeclaration(child, filePath, true);
            if (sym) symbols.push(sym);
          } else if (child.type === 'enum_declaration') {
            const sym = this.extractEnumDeclaration(child, filePath, true);
            if (sym) symbols.push(sym);
          } else if (child.type === 'lexical_declaration' || child.type === 'variable_declaration') {
            const varSyms = this.extractVariableDeclarations(child, filePath, true);
            symbols.push(...varSyms);
          }
        }
        return;
      }

      if (node.type === 'function_declaration') {
        const sym = this.extractFunctionDeclaration(node, filePath, isExportedContext);
        if (sym) symbols.push(sym);
      } else if (node.type === 'class_declaration') {
        const res = this.extractClassDeclaration(node, filePath, isExportedContext);
        if (res) {
          symbols.push(res.classSymbol, ...res.methodSymbols);
        }
      } else if (node.type === 'interface_declaration') {
        const sym = this.extractInterfaceDeclaration(node, filePath, isExportedContext);
        if (sym) symbols.push(sym);
      } else if (node.type === 'type_alias_declaration') {
        const sym = this.extractTypeAliasDeclaration(node, filePath, isExportedContext);
        if (sym) symbols.push(sym);
      } else if (node.type === 'enum_declaration') {
        const sym = this.extractEnumDeclaration(node, filePath, isExportedContext);
        if (sym) symbols.push(sym);
      } else if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        const varSyms = this.extractVariableDeclarations(node, filePath, isExportedContext);
        symbols.push(...varSyms);
      }

      if (node.type !== 'class_declaration') {
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (child) visitTs(child, isExportedContext);
        }
      }
    };

    visitTs(tree.rootNode);

    return {
      filePath,
      symbols,
      durationMs: performance.now() - startTime,
    };
  }
}
