// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SkeletonOptions } from '../../types/index.js';

export function skeletonizeTypeScript(source: string, options: SkeletonOptions = {}): string {
  const lines = source.split('\n');
  const output: string[] = [];

  let inBlockComment = false;
  let inInterfaceOrType = false;
  let inClass = false;
  let classBraceDepth = 0;
  let typeBraceDepth = 0;
  let currentDocstring: string[] = [];

  const placeholder = options.replacementComment || '/* ... implementation truncated by ContextVM ... */';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Handle block comments & docstrings
    if (trimmed.startsWith('/**') || trimmed.startsWith('/*')) {
      inBlockComment = true;
      if (options.preserveDocstrings !== false && trimmed.startsWith('/**')) {
        currentDocstring.push(line);
      }
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }
    if (inBlockComment) {
      if (options.preserveDocstrings !== false) {
        currentDocstring.push(line);
      }
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Skip single-line comments unless docstrings
    if (trimmed.startsWith('//')) {
      continue;
    }

    // Preserve imports and exports
    if (trimmed.startsWith('import ') || trimmed.startsWith('import type ') || trimmed.startsWith('export * from')) {
      output.push(line);
      continue;
    }

    // Preserve interfaces, type aliases, enums
    if (/^export\s+(?:interface|type|enum)\s+/.test(trimmed) || /^(?:interface|type|enum)\s+/.test(trimmed)) {
      if (currentDocstring.length > 0) {
        output.push(...currentDocstring);
        currentDocstring = [];
      }
      output.push(line);
      if (line.includes('{')) {
        inInterfaceOrType = true;
        typeBraceDepth += (line.match(/\{/g) || []).length;
        typeBraceDepth -= (line.match(/\}/g) || []).length;
      }
      continue;
    }

    if (inInterfaceOrType) {
      output.push(line);
      typeBraceDepth += (line.match(/\{/g) || []).length;
      typeBraceDepth -= (line.match(/\}/g) || []).length;
      if (typeBraceDepth <= 0) {
        inInterfaceOrType = false;
        typeBraceDepth = 0;
      }
      continue;
    }

    // Handle class declarations
    if (/^(?:export\s+)?(?:abstract\s+)?class\s+/.test(trimmed)) {
      if (currentDocstring.length > 0) {
        output.push(...currentDocstring);
        currentDocstring = [];
      }
      output.push(line);
      inClass = true;
      classBraceDepth += (line.match(/\{/g) || []).length;
      classBraceDepth -= (line.match(/\}/g) || []).length;
      continue;
    }

    // Inside class: preserve fields and method signatures
    if (inClass) {
      classBraceDepth += (line.match(/\{/g) || []).length;
      classBraceDepth -= (line.match(/\}/g) || []).length;

      if (classBraceDepth <= 0) {
        inClass = false;
        classBraceDepth = 0;
        output.push(line);
        continue;
      }

      // Check for method signatures
      if (/(?:public|private|protected|async|static|\*)\s+[\w$]+\s*\(/.test(trimmed) || /^[\w$]+\s*\(/.test(trimmed)) {
        if (currentDocstring.length > 0) {
          output.push(...currentDocstring);
          currentDocstring = [];
        }

        const indent = line.match(/^\s*/)?.[0] || '  ';
        let sig = line;
        if (line.includes('{')) {
          sig = line.substring(0, line.indexOf('{')).trimEnd();
          output.push(`${sig} { ${placeholder} }`);
          let methodDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          while (methodDepth > 0 && i + 1 < lines.length) {
            i++;
            methodDepth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
            classBraceDepth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
          }
        } else {
          output.push(line);
        }
        continue;
      }

      // Field declarations
      if (/(?:public|private|protected|readonly|static)\s+[\w$]+(?:\s*:\s*[^;=]+)?(?:;|=)/.test(trimmed) || /^[\w$]+\s*:\s*[^;=]+;/.test(trimmed)) {
        output.push(line);
        continue;
      }
    }

    // Standalone functions
    if (/^(?:export\s+)?(?:async\s+)?function\s+/.test(trimmed) || /^(?:export\s+)?const\s+[\w$]+\s*=\s*(?:async\s*)?\([^)]*\)(?:\s*:\s*[^=>{]+)?\s*=>/.test(trimmed)) {
      if (currentDocstring.length > 0) {
        output.push(...currentDocstring);
        currentDocstring = [];
      }

      let sig = line;
      if (line.includes('{')) {
        sig = line.substring(0, line.indexOf('{')).trimEnd();
        output.push(`${sig} { ${placeholder} }`);
        let fnDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        while (fnDepth > 0 && i + 1 < lines.length) {
          i++;
          fnDepth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
        }
      } else {
        output.push(line);
      }
      continue;
    }

    currentDocstring = [];
  }

  return output.join('\n');
}
