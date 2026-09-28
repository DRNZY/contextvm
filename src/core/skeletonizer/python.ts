// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SkeletonOptions } from '../../types/index.js';

export function skeletonizePython(source: string, options: SkeletonOptions = {}): string {
  const lines = source.split('\n');
  const output: string[] = [];
  const placeholder = options.replacementComment || '# ... implementation truncated by ContextVM ...';

  let inDocstring = false;
  let docstringQuote = '';
  let currentDocstring: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Docstring handling (""" or ''')
    if (!inDocstring && (trimmed.startsWith('"""') || trimmed.startsWith("'''"))) {
      docstringQuote = trimmed.substring(0, 3);
      inDocstring = true;
      if (options.preserveDocstrings !== false) {
        currentDocstring.push(line);
      }
      if (trimmed.length > 3 && trimmed.endsWith(docstringQuote)) {
        inDocstring = false;
        output.push(...currentDocstring);
        currentDocstring = [];
      }
      continue;
    }
    if (inDocstring) {
      if (options.preserveDocstrings !== false) {
        currentDocstring.push(line);
      }
      if (trimmed.endsWith(docstringQuote)) {
        inDocstring = false;
        output.push(...currentDocstring);
        currentDocstring = [];
      }
      continue;
    }

    // Skip single-line comments
    if (trimmed.startsWith('#')) {
      continue;
    }

    // Imports
    if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
      output.push(line);
      continue;
    }

    // Class definitions
    if (/^class\s+[\w$]+/.test(trimmed)) {
      output.push(line);
      continue;
    }

    // Function and method definitions
    if (/^(?:async\s+)?def\s+[\w$]+\s*\(/.test(trimmed)) {
      let defLines = [line];
      while (!lines[i].includes(':') && i + 1 < lines.length) {
        i++;
        defLines.push(lines[i]);
      }
      output.push(...defLines);

      const indentMatch = line.match(/^(\s*)/);
      const indent = (indentMatch ? indentMatch[1] : '') + '    ';
      output.push(`${indent}pass  ${placeholder}`);

      // Skip the rest of the body until indentation decreases or next def/class
      const baseIndentLen = indentMatch ? indentMatch[1].length : 0;
      while (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextTrimmed = nextLine.trim();
        if (!nextTrimmed) {
          i++;
          continue;
        }
        const nextIndent = nextLine.match(/^(\s*)/)?.[1].length || 0;
        if (nextIndent <= baseIndentLen) {
          break;
        }
        i++;
      }
      continue;
    }

    // Global variable annotations or assignments
    if (/^[A-Z_0-9]+\s*:\s*[^=]+(?:=.*)?$/.test(trimmed) || /^[a-z_][a-z0-9_]*\s*:\s*[^=]+$/.test(trimmed)) {
      output.push(line);
      continue;
    }
  }

  return output.join('\n');
}
