export type SymbolKind =
  | 'function'
  | 'method'
  | 'class'
  | 'interface'
  | 'type'
  | 'enum'
  | 'variable';

export interface CodeSymbol {
  name: string;
  kind: SymbolKind;
  filePath: string;
  startLine: number;   // 1-indexed for terminal & human readability
  endLine: number;     // 1-indexed
  startColumn: number; // 1-indexed
  endColumn: number;   // 1-indexed
  signature?: string;
  parameters?: string[];
  returnType?: string;
  isExported?: boolean;
  isAsync?: boolean;
  parentSymbol?: string;
}

export interface FileExtractionResult {
  filePath: string;
  symbols: CodeSymbol[];
  durationMs: number;
}
