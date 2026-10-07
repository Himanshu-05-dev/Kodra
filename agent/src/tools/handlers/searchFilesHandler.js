/**
 * @file searchFilesHandler.js
 * Tool handler for 'search_files'.
 * Fast in-workspace grep matching across code files.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export async function searchFilesHandler(args, context) {
  const { query, path: relSubPath = '', caseSensitive = false } = args;
  const { workspacePath, fileRepo } = context;

  if (!query || typeof query !== 'string') {
    throw new Error('Query argument is required and must be a string');
  }

  const searchRoot = fileRepo.resolveSafePath(workspacePath, relSubPath);
  const exists = await fileRepo.exists(searchRoot);
  if (!exists) {
    throw new Error(`Search directory does not exist: "${relSubPath}"`);
  }

  const matches = [];
  const maxMatches = 50;
  const ignoredDirs = new Set(['node_modules', '.git', 'dist', 'build', '.cache']);
  const textExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.md',
    '.env', '.txt', '.svg', '.yml', '.yaml', '.toml', '.cjs', '.mjs'
  ]);

  async function walkDir(currentDir) {
    if (matches.length >= maxMatches) return;

    let dirents;
    try {
      dirents = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const dirent of dirents) {
      if (matches.length >= maxMatches) break;

      if (dirent.isDirectory()) {
        if (!ignoredDirs.has(dirent.name)) {
          await walkDir(path.join(currentDir, dirent.name));
        }
      } else if (dirent.isFile()) {
        const ext = path.extname(dirent.name).toLowerCase();
        if (textExtensions.has(ext) || ext === '') {
          await searchFile(path.join(currentDir, dirent.name));
        }
      }
    }
  }

  async function searchFile(filePath) {
    let content;
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch {
      return;
    }

    const lines = content.split(/\r?\n/);
    const targetQuery = caseSensitive ? query : query.toLowerCase();
    const relFile = path.relative(workspacePath, filePath).replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
      if (matches.length >= maxMatches) break;

      const line = lines[i];
      const testLine = caseSensitive ? line : line.toLowerCase();

      if (testLine.includes(targetQuery)) {
        matches.push({
          file: relFile,
          lineNumber: i + 1,
          lineContent: line.trim()
        });
      }
    }
  }

  await walkDir(searchRoot);

  return {
    query,
    totalMatches: matches.length,
    isCapped: matches.length >= maxMatches,
    matches
  };
}
