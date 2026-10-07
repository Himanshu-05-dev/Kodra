/**
 * @file editFileHandler.js
 * Tool handler for 'edit_file'.
 * Performs surgical code replacements in existing files.
 */

export async function editFileHandler(args, context) {
  const { path: relPath, targetContent, replacementContent } = args;
  const { workspacePath, fileRepo } = context;

  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Path argument is required and must be a string');
  }

  if (typeof targetContent !== 'string' || !targetContent) {
    throw new Error('targetContent must be a non-empty string');
  }

  if (typeof replacementContent !== 'string') {
    throw new Error('replacementContent must be a string');
  }

  const safePath = fileRepo.resolveSafePath(workspacePath, relPath);
  const original = await fileRepo.readFile(safePath);

  // Normalize line endings for consistent matching
  const normalizedOriginal = original.replace(/\r\n/g, '\n');
  const normalizedTarget = targetContent.replace(/\r\n/g, '\n');
  const normalizedReplacement = replacementContent.replace(/\r\n/g, '\n');

  const occurrences = normalizedOriginal.split(normalizedTarget).length - 1;

  if (occurrences === 0) {
    throw new Error(
      `Target content was not found inside "${relPath}". Please read the file first to ensure exact indentation and matching characters.`
    );
  }

  if (occurrences > 1) {
    throw new Error(
      `Found ${occurrences} occurrences of target content in "${relPath}". Please include more surrounding lines of code to make the snippet uniquely identifiable.`
    );
  }

  const updated = normalizedOriginal.replace(normalizedTarget, normalizedReplacement);
  await fileRepo.writeFile(safePath, updated);

  return {
    path: relPath,
    replacementsMade: 1,
    message: `Successfully edited "${relPath}"`
  };
}
