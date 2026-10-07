/**
 * @file readFileHandler.js
 * Tool handler for 'read_file'.
 */

export async function readFileHandler(args, context) {
  const { path: relPath, startLine, endLine } = args;
  const { workspacePath, fileRepo } = context;

  if (!relPath || typeof relPath !== 'string') {
    throw new Error('Path argument is required and must be a string');
  }

  const safePath = fileRepo.resolveSafePath(workspacePath, relPath);
  const rawContent = await fileRepo.readFile(safePath);

  const lines = rawContent.split(/\r?\n/);
  const totalLines = lines.length;

  if (startLine !== undefined || endLine !== undefined) {
    const start = Math.max(1, startLine || 1);
    const end = Math.min(totalLines, endLine || totalLines);

    if (start > end) {
      throw new Error(`startLine (${start}) cannot be greater than endLine (${end})`);
    }

    const slicedLines = lines.slice(start - 1, end);
    const numberedContent = slicedLines
      .map((line, idx) => `${start + idx}: ${line}`)
      .join('\n');

    return {
      path: relPath,
      totalLines,
      startLine: start,
      endLine: end,
      content: numberedContent
    };
  }

  return {
    path: relPath,
    totalLines,
    content: rawContent
  };
}
