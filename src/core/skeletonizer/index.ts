// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SkeletonOptions, SupportedLanguage } from '../../types/index.js';
import { skeletonizeTypeScript } from './ts.js';
import { skeletonizePython } from './python.js';
import { skeletonizeRust } from './rust.js';
import { skeletonizeGo } from './go.js';

export function detectLanguageFromPath(filePath: string): SupportedLanguage {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'mts':
    case 'cts':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'py':
    case 'pyi':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'text';
  }
}

export function skeletonizeCode(source: string, language: SupportedLanguage, options: SkeletonOptions = {}): string {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return skeletonizeTypeScript(source, options);
    case 'python':
      return skeletonizePython(source, options);
    case 'rust':
      return skeletonizeRust(source, options);
    case 'go':
      return skeletonizeGo(source, options);
    default:
      return source;
  }
}
