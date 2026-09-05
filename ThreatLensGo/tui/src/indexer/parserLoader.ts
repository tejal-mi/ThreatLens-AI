import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Parser from 'web-tree-sitter';
import { SupportedLanguage } from './types.js';

let isInitialized = false;
const loadedLanguages = new Map<SupportedLanguage, Parser.Language>();

function getWasmOutDir(): string {
  // Locate tree-sitter-wasms/out directory reliably
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return path.resolve(currentDir, '../../node_modules/tree-sitter-wasms/out');
  } catch {
    return path.resolve(process.cwd(), 'node_modules/tree-sitter-wasms/out');
  }
}

/**
 * Initializes the WebAssembly tree-sitter runtime.
 */
export async function initTreeSitter(): Promise<void> {
  if (!isInitialized) {
    await Parser.init();
    isInitialized = true;
  }
}

/**
 * Loads and caches a Tree-sitter WASM grammar for a given language.
 */
export async function loadLanguage(lang: SupportedLanguage): Promise<Parser.Language | null> {
  await initTreeSitter();

  if (loadedLanguages.has(lang)) {
    return loadedLanguages.get(lang)!;
  }

  const wasmDir = getWasmOutDir();
  let wasmFileName: string | null = null;

  switch (lang) {
    case 'typescript':
      wasmFileName = 'tree-sitter-typescript.wasm';
      break;
    case 'javascript':
      wasmFileName = 'tree-sitter-javascript.wasm';
      break;
    case 'python':
      wasmFileName = 'tree-sitter-python.wasm';
      break;
    case 'go':
      wasmFileName = 'tree-sitter-go.wasm';
      break;
    case 'rust':
      wasmFileName = 'tree-sitter-rust.wasm';
      break;
    case 'java':
      wasmFileName = 'tree-sitter-java.wasm';
      break;
    case 'cpp':
      wasmFileName = 'tree-sitter-cpp.wasm';
      break;
    default:
      return null;
  }

  try {
    const wasmPath = path.join(wasmDir, wasmFileName);
    const language = await Parser.Language.load(wasmPath);
    loadedLanguages.set(lang, language);
    return language;
  } catch (err) {
    console.error(`Failed to load Tree-sitter WASM grammar for ${lang}:`, err);
    return null;
  }
}

/**
 * Creates and returns a ready-to-use Tree-sitter Parser instance for the specified language.
 */
export async function createParser(lang: SupportedLanguage, isTsx = false): Promise<Parser | null> {
  await initTreeSitter();

  let language: Parser.Language | null = null;
  if (lang === 'typescript' && isTsx) {
    const wasmDir = getWasmOutDir();
    const wasmPath = path.join(wasmDir, 'tree-sitter-tsx.wasm');
    language = await Parser.Language.load(wasmPath);
  } else {
    language = await loadLanguage(lang);
  }

  if (!language) return null;

  const parser = new Parser();
  parser.setLanguage(language);
  return parser;
}
