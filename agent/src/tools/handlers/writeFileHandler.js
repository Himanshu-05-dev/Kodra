/**
 * @file writeFileHandler.js
 * Tool handler for 'write_file'.
 */

export async function writeFileHandler(args, context) {
  const { path: relPath, content } = args;
  const { workspacePath, fileRepo } = context;

  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Path argument is required and must be a string');
  }

  if (content === undefined || typeof content !== 'string') {
    throw new Error('Content argument is required and must be a string');
  }

  const safePath = fileRepo.resolveSafePath(workspacePath, relPath);
  await fileRepo.writeFile(safePath, content);

  const linesCount = content.split(/\r?\n/).length;

  return {
    path: relPath,
    bytesWritten: Buffer.byteLength(content, 'utf8'),
    linesCount,
    message: `Successfully wrote ${linesCount} lines to "${relPath}"`
  };
}
