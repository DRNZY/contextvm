// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SupportedLanguage } from '../../types/index.js';

export type ContentCategory = 'code' | 'json' | 'logs' | 'prose';

export function detectContentCategory(text: string): { category: ContentCategory; language?: SupportedLanguage } {
  const trimmed = text.trim();
  if (!trimmed) return { category: 'prose', language: 'text' };

  // Check direct or embedded JSON
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return { category: 'json', language: 'json' };
    } catch {}
  }

  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch && jsonMatch[0].length > 100) {
    try {
      JSON.parse(jsonMatch[0]);
      return { category: 'json', language: 'json' };
    } catch {}
  }

  // Check Code signatures & markdown code blocks
  if (/```(?:ts|typescript|js|javascript|py|python|rs|rust|go)/i.test(trimmed)) {
    return { category: 'code', language: 'typescript' };
  }
  if (/^(?:import\s+|export\s+|function\s+|const\s+|class\s+|interface\s+|type\s+)/m.test(trimmed)) {
    return { category: 'code', language: 'typescript' };
  }
  if (/^(?:def\s+|class\s+|import\s+|from\s+[\w.]+\s+import)/m.test(trimmed)) {
    return { category: 'code', language: 'python' };
  }
  if (/^(?:fn\s+|pub\s+fn|struct\s+|impl\s+|use\s+[\w:]+;)/m.test(trimmed)) {
    return { category: 'code', language: 'rust' };
  }
  if (/^(?:package\s+|func\s+|type\s+[\w$]+\s+struct)/m.test(trimmed)) {
    return { category: 'code', language: 'go' };
  }

  // Check Logs
  const lines = trimmed.split('\n');
  let logKeywords = 0;
  for (const l of lines.slice(0, 30)) {
    if (/\b(?:INFO|DEBUG|WARN|WARNING|ERROR|FATAL|PANIC|TRACE|CRITICAL)\b/i.test(l) || /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/.test(l)) {
      logKeywords++;
    }
  }
  if (logKeywords >= 3 || (lines.length > 5 && logKeywords / Math.min(lines.length, 30) > 0.3)) {
    return { category: 'logs', language: 'text' };
  }

  return { category: 'prose', language: 'text' };
}
