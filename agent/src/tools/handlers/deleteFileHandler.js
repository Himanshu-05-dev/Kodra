/**
 * @file deleteFileHandler.js
 * Tool handler for 'delete_file'.
 */

export async function deleteFileHandler(args, context) {
  const { path: relPath } = args;
  const { workspacePath, fileRepo } = context;

  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Path argument is required and must be a string');
  }

  const safePath = fileRepo.resolveSafePath(workspacePath, relPath);
  const exists = await fileRepo.exists(safePath);

  if (!exists) {
    throw new Error(`File does not exist: "${relPath}"`);
  }

  await fileRepo.deleteFile(safePath);

  return {
    path: relPath,
    deleted: true,
    message: `Successfully deleted "${relPath}"`
  };
}
