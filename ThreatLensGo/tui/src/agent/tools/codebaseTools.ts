import path from 'node:path';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { ToolDefinition, ToolResult } from './types.js';
import { generateUnifiedDiff } from './diffUtils.js';
import { DiffApprovalPayload } from '../types.js';
import { truncateFileContent } from '../guardrails/resourceGuard.js';

export const searchCodeTool: ToolDefinition = {
  name: 'search_code',
  description: 'Searches the codebase using AST symbols, raw text matching, or multi-modal ranking.',
  parameters: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Search term or regex pattern' },
      mode: {
        type: 'string',
        enum: ['unified', 'symbol', 'text'],
        description: "Search mode: 'unified' (ranked symbols + text), 'symbol' (AST symbols only), or 'text' (ripgrep only)",
      },
      isRegex: { type: 'boolean', description: 'Whether query is a regular expression for text search' },
    },
    required: ['query'],
  },
  execute: async (args, context): Promise<ToolResult> => {
    const query = args.query;
    const mode = args.mode || 'unified';

    if (mode === 'symbol') {
      const symbols = context.searchEngine.searchSymbols(query, false);
      return {
        success: true,
        data: {
          symbols: symbols.map((s) => ({
            name: s.name,
            kind: s.kind,
            file: s.file_path,
            lines: `${s.start_line}-${s.end_line}`,
            signature: s.signature,
          })),
        },
      };
    } else if (mode === 'text') {
      const matches = await context.searchEngine.searchText(query, { isRegex: args.isRegex });
      return {
        success: true,
        data: {
          matches: matches.slice(0, 30).map((m) => ({
            file: m.filePath,
            line: m.lineNumber,
            snippet: m.lineText,
          })),
        },
      };
    } else {
      const unified = await context.searchEngine.query(query);
      return {
        success: true,
        data: {
          exactSymbols: unified.exactSymbols.map((s) => ({
            name: s.name,
            kind: s.kind,
            file: s.file_path,
            lines: `${s.start_line}-${s.end_line}`,
            signature: s.signature,
          })),
          partialSymbols: unified.partialSymbols.slice(0, 10).map((s) => ({
            name: s.name,
            kind: s.kind,
            file: s.file_path,
            lines: `${s.start_line}-${s.end_line}`,
          })),
          textMatches: unified.textMatches.slice(0, 15).map((m) => ({
            file: m.filePath,
            line: m.lineNumber,
            snippet: m.lineText,
          })),
        },
      };
    }
  },
};

export const findSymbolTool: ToolDefinition = {
  name: 'find_symbol',
  description: 'Finds structural code symbols (functions, classes, methods, interfaces) by exact or partial name.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Symbol name to search for' },
      exact: { type: 'boolean', description: 'Whether to perform exact matching (default: false)' },
    },
    required: ['name'],
  },
  execute: async (args, context): Promise<ToolResult> => {
    const symbols = context.searchEngine.searchSymbols(args.name, args.exact ?? false);
    return {
      success: true,
      data: symbols.map((s) => ({
        name: s.name,
        kind: s.kind,
        file: s.file_path,
        lines: `${s.start_line}-${s.end_line}`,
        signature: s.signature,
        parentSymbol: s.parent_symbol,
      })),
    };
  },
};

export const readFileTool: ToolDefinition = {
  name: 'read_file',
  description: 'Reads the content of a file with optional line range slicing (1-indexed).',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path to the file' },
      startLine: { type: 'number', description: 'Starting line number (1-indexed, optional)' },
      endLine: { type: 'number', description: 'Ending line number (1-indexed, optional)' },
    },
    required: ['path'],
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const fullPath = path.resolve(context.workspaceRoot, args.path);
      const content = await fs.readFile(fullPath, 'utf8');
      const lines = content.split('\n');

      const start = args.startLine ? Math.max(1, args.startLine) : 1;
      const end = args.endLine ? Math.min(lines.length, args.endLine) : lines.length;

      const slicedLines = lines.slice(start - 1, end);
      const text = slicedLines.join('\n');
      const truncated = truncateFileContent(text, { maxBytes: 32 * 1024 });

      return {
        success: true,
        data: {
          file: args.path.replace(/\\/g, '/'),
          startLine: start,
          endLine: end,
          totalLines: lines.length,
          content: truncated.text,
          isTruncated: truncated.isTruncated,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to read file '${args.path}': ${err.message}`,
      };
    }
  },
};

export const editFileTool: ToolDefinition = {
  name: 'edit_file',
  description: 'Proposes an edit to a file by replacing oldContent with newContent. Generates a DiffApprovalPayload for user confirmation.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path of file to edit' },
      oldContent: { type: 'string', description: 'Exact string/block to be replaced in the file' },
      newContent: { type: 'string', description: 'Replacement string/block' },
      description: { type: 'string', description: 'Clear explanation of why this modification is being made' },
    },
    required: ['path', 'oldContent', 'newContent', 'description'],
  },
  execute: async (args, context): Promise<ToolResult> => {
    try {
      const relPath = args.path.replace(/\\/g, '/');
      const fullPath = path.resolve(context.workspaceRoot, relPath);
      const fileContent = await fs.readFile(fullPath, 'utf8');

      if (!fileContent.includes(args.oldContent)) {
        return {
          success: false,
          error: `oldContent not found in '${relPath}'. Please re-read the file to ensure exact matching.`,
        };
      }

      const updatedContent = fileContent.replace(args.oldContent, args.newContent);
      const patch = generateUnifiedDiff(relPath, fileContent, updatedContent);

      const approvalPayload: DiffApprovalPayload = {
        id: `diff_${crypto.randomBytes(4).toString('hex')}`,
        file: relPath,
        originalContent: fileContent,
        newContent: updatedContent,
        patch,
        description: args.description,
      };

      return {
        success: true,
        data: {
          message: 'Edit prepared. Diff approval required before applying to disk.',
          diffId: approvalPayload.id,
          patch,
        },
        requiresApproval: approvalPayload,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to edit file '${args.path}': ${err.message}`,
      };
    }
  },
};

export const listDirectoryTool: ToolDefinition = {
  name: 'list_directory',
  description: 'Lists all indexed source files in the project workspace.',
  parameters: {
    type: 'object',
    properties: {
      directory: { type: 'string', description: 'Subdirectory path (optional)' },
    },
  },
  execute: async (args, context): Promise<ToolResult> => {
    const allFiles = context.store.getAllFilesMap();
    const files = Array.from(allFiles.values()).map((f) => ({
      path: f.path,
      language: f.language,
      sizeBytes: f.size_bytes,
    }));

    return {
      success: true,
      data: {
        totalFiles: files.length,
        files: files.slice(0, 100),
      },
    };
  },
};

export const getDependenciesTool: ToolDefinition = {
  name: 'get_dependencies',
  description: 'Retrieves outgoing imports and incoming dependents for a file in the project.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative path of the target file' },
    },
    required: ['path'],
  },
  execute: async (args, context): Promise<ToolResult> => {
    const relPath = args.path.replace(/\\/g, '/');
    const outgoing = context.searchEngine.getDependencies(relPath);
    const incoming = context.searchEngine.getDependents(relPath);

    return {
      success: true,
      data: {
        file: relPath,
        imports: outgoing.directDependencies,
        importedBy: incoming.directDependents,
        externalPackages: outgoing.externalPackages,
        hasCircularDependency: outgoing.hasCycle,
      },
    };
  },
};
