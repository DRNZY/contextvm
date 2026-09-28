// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SkeletonOptions } from '../../types/index.js';

export function skeletonizeRust(source: string, options: SkeletonOptions = {}): string {
  const lines = source.split('\n');
  const output: string[] = [];
  const placeholder = options.replacementComment || '/* ... implementation truncated by ContextVM ... */';

  let inBlockComment = false;
  let inStructOrEnum = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('/*')) {
      inBlockComment = true;
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }

    if (trimmed.startsWith('//') && !trimmed.startsWith('///')) {
      continue;
    }

    if (trimmed.startsWith('use ') || trimmed.startsWith('pub use ') || trimmed.startsWith('extern crate ')) {
      output.push(line);
      continue;
    }

    // Struct, Enum, Trait definitions
    if (/^(?:pub\s+)?(?:struct|enum|trait|type|const|static)\s+/.test(trimmed)) {
      output.push(line);
      if (line.includes('{')) {
        inStructOrEnum = true;
        braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      }
      continue;
    }

    if (inStructOrEnum) {
      output.push(line);
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) {
        inStructOrEnum = false;
        braceDepth = 0;
      }
      continue;
    }

    // Impl blocks
    if (/^(?:pub\s+)?impl(?:\s*<[^>]+>)?\s+/.test(trimmed)) {
      output.push(line);
      continue;
    }

    // Function definitions
    if (/^(?:pub\s+)?(?:async\s+)?(?:unsafe\s+)?(?:extern\s+"[^"]+"\s+)?fn\s+[\w$]+/.test(trimmed)) {
      if (line.includes('{')) {
        const sig = line.substring(0, line.indexOf('{')).trimEnd();
        output.push(`${sig} { ${placeholder} }`);
        let fnBraces = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        while (fnBraces > 0 && i + 1 < lines.length) {
          i++;
          fnBraces += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
        }
      } else {
        output.push(line);
      }
      continue;
    }

    if (trimmed === '}' || trimmed === '};') {
      output.push(line);
    }
  }

  return output.join('\n');
}
