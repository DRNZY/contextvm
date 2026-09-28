// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { CompressionOptions, CompressionResult } from '../../types/index.js';
import { detectContentCategory } from './router.js';
import { crushJson } from './json-crusher.js';
import { trimLogs } from './log-trimmer.js';
import { skeletonizeCode, detectLanguageFromPath } from '../skeletonizer/index.js';
import { estimateTokenCount } from '../packager/tokenizer.js';
import { saveCCR } from '../ccr/store.js';

export function compress(content: string, options: CompressionOptions = {}): CompressionResult {
  const originalSize = Buffer.byteLength(content, 'utf-8');
  const originalTokens = estimateTokenCount(content);

  let category = options.contentType === 'auto' || !options.contentType ? detectContentCategory(content).category : options.contentType;
  let compressed = content;

  switch (category) {
    case 'json':
      compressed = crushJson(content);
      break;
    case 'logs':
      compressed = trimLogs(content);
      break;
    case 'code': {
      const lang = options.language || (options.contentType === 'code' ? 'typescript' : detectContentCategory(content).language || 'typescript');
      compressed = skeletonizeCode(content, lang, options.skeletonOptions);
      break;
    }
    case 'prose':
    default:
      compressed = content;
      break;
  }

  let retrievalHash: string | undefined;
  if (options.enableCCR && compressed.length < content.length) {
    const summary = `Compressed ${category} payload (~${originalTokens} tokens -> ~${estimateTokenCount(compressed)} tokens)`;
    retrievalHash = saveCCR(content, category, summary);
  }

  const compressedSize = Buffer.byteLength(compressed, 'utf-8');
  const compressedTokens = estimateTokenCount(compressed);
  const tokensSaved = Math.max(0, originalTokens - compressedTokens);
  const ratio = originalTokens > 0 ? compressedTokens / originalTokens : 1.0;

  return {
    compressed,
    originalSize,
    compressedSize,
    originalTokens,
    compressedTokens,
    tokensSaved,
    ratio,
    contentType: category,
    retrievalHash,
  };
}
