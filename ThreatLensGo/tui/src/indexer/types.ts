export type SupportedLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'go'
  | 'rust'
  | 'java'
  | 'cpp'
  | 'json'
  | 'yaml'
  | 'toml'
  | 'markdown'
  | 'sql'
  | 'shell'
  | 'unknown';

export interface IndexedFile {
  relativePath: string;
  absolutePath: string;
  extension: string;
  language: SupportedLanguage;
  sizeBytes: number;
  hash: string;
  modifiedTimeMs: number;
  isBinary: boolean;
}

export interface LanguageSummary {
  language: SupportedLanguage;
  fileCount: number;
  totalSizeBytes: number;
}

export interface FileScanResult {
  rootPath: string;
  files: IndexedFile[];
  languageStats: Record<string, LanguageSummary>;
  totalFiles: number;
  totalSizeBytes: number;
  ignoredCount: number;
  durationMs: number;
}

export interface ScanOptions {
  customIgnores?: string[];
  maxFileSizeBytes?: number; // Skip files larger than this (default 10MB)
  includeBinary?: boolean;
}
