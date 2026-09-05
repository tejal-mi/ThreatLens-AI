/**
 * Generates a unified diff patch string between originalContent and newContent.
 */
export function generateUnifiedDiff(
  filePath: string,
  originalContent: string,
  newContent: string,
  contextLines = 3
): string {
  const origLines = originalContent.split('\n');
  const newLines = newContent.split('\n');

  const normalizedPath = filePath.replace(/\\/g, '/');
  const header = `--- a/${normalizedPath}\n+++ b/${normalizedPath}\n`;

  // Find first difference
  let start = 0;
  while (start < origLines.length && start < newLines.length && origLines[start] === newLines[start]) {
    start++;
  }

  // Find trailing common lines
  let origEnd = origLines.length - 1;
  let newEnd = newLines.length - 1;
  while (origEnd >= start && newEnd >= start && origLines[origEnd] === newLines[newEnd]) {
    origEnd--;
    newEnd--;
  }

  const hunkOrigStart = Math.max(1, start - contextLines + 1);
  const hunkOrigCount = origEnd - hunkOrigStart + contextLines + 1;
  const hunkNewStart = Math.max(1, start - contextLines + 1);
  const hunkNewCount = newEnd - hunkNewStart + contextLines + 1;

  const hunkHeader = `@@ -${hunkOrigStart},${Math.max(1, hunkOrigCount)} +${hunkNewStart},${Math.max(1, hunkNewCount)} @@\n`;

  const diffBody: string[] = [];

  // Leading context
  for (let i = hunkOrigStart - 1; i < start; i++) {
    if (i >= 0 && i < origLines.length) {
      diffBody.push(` ${origLines[i]}`);
    }
  }

  // Deleted lines
  for (let i = start; i <= origEnd; i++) {
    if (i < origLines.length) {
      diffBody.push(`-${origLines[i]}`);
    }
  }

  // Added lines
  for (let i = start; i <= newEnd; i++) {
    if (i < newLines.length) {
      diffBody.push(`+${newLines[i]}`);
    }
  }

  // Trailing context
  const trailingLimit = Math.min(origLines.length, origEnd + 1 + contextLines);
  for (let i = origEnd + 1; i < trailingLimit; i++) {
    if (i < origLines.length) {
      diffBody.push(` ${origLines[i]}`);
    }
  }

  return header + hunkHeader + diffBody.join('\n');
}
