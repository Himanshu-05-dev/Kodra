/**
 * @file FileSystemRepository.js
 * Layer 3: Data Access - Physical Workspace Storage on Host Disk.
 * Implements strict canonical path traversal defenses and safe file operations.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { SecurityViolationError, NotFoundError } from '../utils/AppError.js';

export class FileSystemRepository {
  /**
   * Safely resolve a path relative to a base directory.
   * Throws SecurityViolationError if the target path attempts to escape baseDir.
   * @param {string} baseDir 
   * @param {string} relativePath 
   * @returns {string} Fully qualified canonical safe path
   */
  resolveSafePath(baseDir, relativePath = '') {
    const normalizedBase = path.resolve(baseDir);
    const resolvedPath = path.resolve(normalizedBase, relativePath);

    // Guard: Prevent path traversal (e.g. ../../etc/passwd)
    if (!resolvedPath.startsWith(normalizedBase)) {
      throw new SecurityViolationError(
        `Access denied: Target path "${relativePath}" escapes root workspace boundary.`
      );
    }

    return resolvedPath;
  }

  /**
   * Check if a path exists
   */
  async exists(targetPath) {
    try {
      await fs.access(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create a directory recursively
   */
  async createDirectory(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
    return dirPath;
  }

  /**
   * Write content to a file, creating parent directories if needed
   */
  async writeFile(filePath, content = '') {
    const parentDir = path.dirname(filePath);
    await fs.mkdir(parentDir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf8');
    return filePath;
  }

  /**
   * Read file content as string
   */
  async readFile(filePath) {
    const exists = await this.exists(filePath);
    if (!exists) {
      throw new NotFoundError(`File "${path.basename(filePath)}" does not exist.`);
    }
    return await fs.readFile(filePath, 'utf8');
  }

  /**
   * Delete a single file
   */
  async deleteFile(filePath) {
    const exists = await this.exists(filePath);
    if (exists) {
      await fs.unlink(filePath);
    }
  }

  /**
   * Delete a directory recursively
   */
  async deleteDirectory(dirPath) {
    const exists = await this.exists(dirPath);
    if (exists) {
      await fs.rm(dirPath, { recursive: true, force: true });
    }
  }

  /**
   * Get file stats (size, modified time)
   */
  async getStats(targetPath) {
    return await fs.stat(targetPath);
  }

  /**
   * Build a recursive directory tree
   * Ignores node_modules, .git, and dist for IDE performance
   */
  async getDirectoryTree(currentPath, rootPath = currentPath) {
    const stats = await fs.stat(currentPath);
    const name = path.basename(currentPath);
    const relativePath = path.relative(rootPath, currentPath).replace(/\\/g, '/');

    if (!stats.isDirectory()) {
      return {
        name,
        path: relativePath,
        type: 'file',
        size: stats.size,
        updatedAt: stats.mtime
      };
    }

    const dirents = await fs.readdir(currentPath, { withFileTypes: true });
    const ignoredNames = new Set(['node_modules', '.git', 'dist', '.DS_Store']);

    const children = [];
    for (const dirent of dirents) {
      if (ignoredNames.has(dirent.name)) continue;

      const childPath = path.join(currentPath, dirent.name);
      const childNode = await this.getDirectoryTree(childPath, rootPath);
      children.push(childNode);
    }

    // Sort: directories first, then alphabetical
    children.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });

    return {
      name: relativePath === '' ? 'root' : name,
      path: relativePath,
      type: 'directory',
      children
    };
  }
}
