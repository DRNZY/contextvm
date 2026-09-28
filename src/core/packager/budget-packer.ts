// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PackOptions, PackResult, PackedFile } from '../../types/index.js';
import { estimateTokenCount } from './tokenizer.js';
import { skeletonizeCode, detectLanguageFromPath } from '../skeletonizer/index.js';

export function packDirectory(dirPath: string, options: PackOptions): PackResult {
  const maxTokens = options.maxTokens;
  const filesFound: { relPath: string; fullPath: string; size: number }[] = [];

  const defaultExcludes = new Set([
    'node_modules', '.git', 'dist', 'build', '.venv', 'target', '.cache',
    'package-lock.json', 'yarn.lock', 'Cargo.lock', '.next', '.nuxt',
    '.DS_Store'
  ]);

  function scan(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (defaultExcludes.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      const rel = path.relative(dirPath, full);

      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(full);
          if (stat.size < 1024 * 1024) { // Ignore >1MB files
            filesFound.push({ relPath: rel, fullPath: full, size: stat.size });
          }
        } catch {}
      }
    }
  }

  scan(dirPath);

  // Score file priorities: entrypoints, types, configs, readmes have higher priority
  const scoredFiles = filesFound.map(f => {
    let priority = 10;
    const lower = f.relPath.toLowerCase();
    if (lower.includes('readme.md') || lower.includes('package.json') || lower.includes('cargo.toml')) priority = 100;
    else if (lower.includes('types') || lower.includes('index.') || lower.includes('main.') || lower.includes('app.')) priority = 80;
    else if (lower.includes('lib/') || lower.includes('src/core/')) priority = 60;
    else if (lower.includes('test') || lower.includes('spec')) priority = 20;

    return { ...f, priority };
  });

  // Sort by priority descending, then size ascending
  scoredFiles.sort((a, b) => b.priority - a.priority || a.size - b.size);

  const packed: PackedFile[] = [];
  const omitted: string[] = [];
  let currentTokens = 0;

  for (const item of scoredFiles) {
    try {
      const rawContent = fs.readFileSync(item.fullPath, 'utf-8');
      const lang = detectLanguageFromPath(item.relPath);

      let contentToUse = rawContent;
      let isSkeletonized = false;

      // If requested or if file is large, skeletonize code
      if (options.skeletonizeCode && ['typescript', 'javascript', 'python', 'rust', 'go'].includes(lang)) {
        const skeleton = skeletonizeCode(rawContent, lang);
        if (skeleton.length < rawContent.length) {
          contentToUse = skeleton;
          isSkeletonized = true;
        }
      }

      const fileTokens = estimateTokenCount(contentToUse);

      if (currentTokens + fileTokens <= maxTokens) {
        packed.push({
          path: item.relPath,
          content: contentToUse,
          tokens: fileTokens,
          skeletonized: isSkeletonized,
          priority: item.priority,
        });
        currentTokens += fileTokens;
      } else {
        // If not skeletonized yet, try skeletonizing to fit budget
        if (!isSkeletonized && ['typescript', 'javascript', 'python', 'rust', 'go'].includes(lang)) {
          const skeleton = skeletonizeCode(rawContent, lang);
          const skelTokens = estimateTokenCount(skeleton);
          if (currentTokens + skelTokens <= maxTokens) {
            packed.push({
              path: item.relPath,
              content: skeleton,
              tokens: skelTokens,
              skeletonized: true,
              priority: item.priority,
            });
            currentTokens += skelTokens;
            continue;
          }
        }
        omitted.push(item.relPath);
      }
    } catch {
      omitted.push(item.relPath);
    }
  }

  return {
    files: packed,
    totalTokens: currentTokens,
    budgetTokens: maxTokens,
    utilization: maxTokens > 0 ? (currentTokens / maxTokens) * 100 : 0,
    omittedFiles: omitted,
  };
}
