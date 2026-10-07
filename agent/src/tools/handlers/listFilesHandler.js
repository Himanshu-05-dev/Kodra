/**
 * @file listFilesHandler.js
 * Tool handler for 'list_files'.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export async function listFilesHandler(args, context) {
  const { path: relPath = '', recursive = false } = args;
  const { workspacePath, fileRepo } = context;

  const targetPath = fileRepo.resolveSafePath(workspacePath, relPath);
  const exists = await fileRepo.exists(targetPath);

  if (!exists) {
    throw new Error(`Directory does not exist: "${relPath || '.'}"`);
  }

  const stats = await fs.stat(targetPath);
  if (!stats.isDirectory()) {
    throw new Error(`Path is a file, not a directory: "${relPath}"`);
  }

  if (recursive) {
    const tree = await fileRepo.getDirectoryTree(targetPath, workspacePath);
    return {
      path: relPath || '.',
      tree
    };
  }

  // Non-recursive: list immediate children
  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const ignored = new Set(['node_modules', '.git', 'dist', '.DS_Store']);

  const files = [];
  const directories = [];

  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    if (entry.isDirectory()) {
      directories.push(entry.name);
    } else {
      files.push(entry.name);
    }
  }

  return {
    path: relPath || '.',
    directories: directories.sort(),
    files: files.sort()
  };
}
