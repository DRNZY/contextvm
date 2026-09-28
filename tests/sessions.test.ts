// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { trimSession } from '../src/core/sessions/trimmer.js';
import { createSnapshot, loadSnapshot } from '../src/core/sessions/branch-manager.js';
import { buildSessionTreeAscii } from '../src/core/sessions/tree-builder.js';
import { SessionData } from '../src/types/index.js';

describe('Session Virtualization & Trimming', () => {
  const sampleSession: SessionData = {
    sessionId: 'test-session-1',
    agentType: 'claude',
    filePath: '/tmp/test.jsonl',
    turns: [
      {
        turnIndex: 0,
        messages: [{
          role: 'user',
          content: 'Please read src/auth.ts',
        }],
        tokens: 15,
        toolResultsCount: 0,
      },
      {
        turnIndex: 1,
        messages: [{
          role: 'assistant',
          content: [
            { type: 'thinking', thinking: 'Let me think deeply about this file...' },
            { type: 'tool_result', tool_use_id: '123', content: 'export const token = "abc";\n'.repeat(100) },
            { type: 'text', text: 'The auth module uses JWT tokens.' },
          ],
        }],
        tokens: 800,
        toolResultsCount: 1,
      },
      {
        turnIndex: 2,
        messages: [{
          role: 'user',
          content: 'Now update the expiration time.',
        }],
        tokens: 20,
        toolResultsCount: 0,
      },
    ],
    totalTokens: 835,
    createdAt: Date.now() - 10000,
    updatedAt: Date.now(),
  };

  it('trims historical tool results and thinking blocks while preserving synthesis and recent turns', () => {
    const { session: trimmed, metrics } = trimSession(sampleSession, {
      thresholdChars: 100,
      preserveLastNTurns: 1,
      enableCCR: true,
    });

    expect(metrics.thinkingBlocksPruned).toBe(1);
    expect(metrics.toolResultsStubbed).toBe(1);
    expect(metrics.tokensSaved).toBeGreaterThan(0);
    // thinking block was removed, so tool_result is at index 0 and text is at index 1
    expect(trimmed.turns[1].messages[0].content[0].content).toContain('ContextVM CCR Vault');
    expect(trimmed.turns[1].messages[0].content[1].text).toBe('The auth module uses JWT tokens.');
  });

  it('creates and loads session snapshots', () => {
    const snapPath = createSnapshot(sampleSession, 'feature-branch-alpha');
    expect(snapPath).toBeDefined();

    const loaded = loadSnapshot('feature-branch-alpha');
    expect(loaded?.sessionId).toBe(sampleSession.sessionId);
    expect(loaded?.branchName).toBe('feature-branch-alpha');
  });

  it('builds ASCII context lineage tree', () => {
    const tree = buildSessionTreeAscii([sampleSession]);
    expect(tree).toContain('test-session-1');
    expect(tree).toContain('[claude]');
  });
});
