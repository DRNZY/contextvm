// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

export interface LogTrimOptions {
  preserveContextLines?: number;
  maxConsecutiveInfo?: number;
}

export function trimLogs(logs: string, options: LogTrimOptions = {}): string {
  const lines = logs.split('\n');
  if (lines.length <= 20) return logs;

  const maxConsecutive = options.maxConsecutiveInfo ?? 3;
  const isImportant = (l: string) => /\b(?:ERROR|FATAL|PANIC|CRITICAL|FAIL|FAILED|EXCEPTION|TRACEBACK|ERR)\b/i.test(l) || /^\s+at\s+/.test(l);

  const output: string[] = [];
  let skippedCount = 0;
  let normalCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isImportant(line)) {
      if (skippedCount > 0) {
        output.push(`[... ContextVM skipped ${skippedCount} routine log lines ...]`);
        skippedCount = 0;
      }
      output.push(line);
      normalCount = 0;
      continue;
    }

    if (normalCount < maxConsecutive) {
      output.push(line);
      normalCount++;
    } else {
      skippedCount++;
    }
  }

  if (skippedCount > 0) {
    output.push(`[... ContextVM skipped ${skippedCount} trailing routine log lines ...]`);
  }

  return output.join('\n');
}
