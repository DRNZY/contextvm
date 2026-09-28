// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SkeletonOptions } from '../../types/index.js';

export function skeletonizeGo(source: string, options: SkeletonOptions = {}): string {
  const lines = source.split('\n');
  const output: string[] = [];
  const placeholder = options.replacementComment || '/* ... implementation truncated by ContextVM ... */';

  let inTypeBlock = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('//') && !trimmed.startsWith('// Package') && !trimmed.startsWith('// type')) {
      continue;
    }

    if (trimmed.startsWith('package ') || trimmed.startsWith('import ') || trimmed === 'import (') {
      output.push(line);
      if (trimmed === 'import (') {
        while (i + 1 < lines.length && lines[i + 1].trim() !== ')') {
          i++;
          output.push(lines[i]);
        }
        if (i + 1 < lines.length) {
          i++;
          output.push(lines[i]);
        }
      }
      continue;
    }

    // Type struct / interface definitions
    if (/^type\s+[\w$]+\s+(?:struct|interface)\s*\{/.test(trimmed)) {
      output.push(line);
      inTypeBlock = true;
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      continue;
    }

    if (inTypeBlock) {
      output.push(line);
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      if (braceDepth <= 0) {
        inTypeBlock = false;
        braceDepth = 0;
      }
      continue;
    }

    // Function / Method definitions
    if (/^func\s+(?:\([^)]+\)\s+)?[\w$]+\s*\(/.test(trimmed)) {
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

    if (trimmed.startsWith('var ') || trimmed.startsWith('const ') || trimmed === 'var (' || trimmed === 'const (') {
      output.push(line);
    }
  }

  return output.join('\n');
}
