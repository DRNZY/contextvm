// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SessionData, TrimMetrics, SessionTurn } from '../../types/index.js';
import { estimateTokenCount } from '../packager/tokenizer.js';
import { saveCCR } from '../ccr/store.js';
import { formatRetrievalStub } from '../ccr/retriever.js';

export interface TrimSessionOptions {
  thresholdChars?: number;
  preserveLastNTurns?: number;
  enableCCR?: boolean;
}

export function trimSession(session: SessionData, options: TrimSessionOptions = {}): {
  session: SessionData;
  metrics: TrimMetrics;
} {
  const threshold = options.thresholdChars ?? 400;
  const preserveRecent = options.preserveLastNTurns ?? 2;
  const enableCCR = options.enableCCR ?? true;

  const metrics: TrimMetrics = {
    originalTokens: session.totalTokens,
    trimmedTokens: 0,
    tokensSaved: 0,
    toolResultsStubbed: 0,
    imagesStripped: 0,
    thinkingBlocksPruned: 0,
    ccrEntriesCreated: 0,
  };

  const turnsCount = session.turns.length;
  const trimmedTurns: SessionTurn[] = [];

  for (let idx = 0; idx < turnsCount; idx++) {
    const turn = session.turns[idx];
    const isRecent = idx >= turnsCount - preserveRecent;

    if (isRecent) {
      // Preserve recent conversation verbatim
      trimmedTurns.push(turn);
      continue;
    }

    const newMessages = turn.messages.map(msg => {
      let content = msg.content;

      // Handle array content (Claude/Anthropic format)
      if (Array.isArray(content)) {
        const filteredBlocks = content.filter((b: any) => {
          if (b.type === 'thinking') {
            metrics.thinkingBlocksPruned++;
            return false;
          }
          return true;
        }).map((block: any) => {
          if (block.type === 'image') {
            metrics.imagesStripped++;
            return { type: 'text', text: '[Image attachment pruned by ContextVM]' };
          }
          if (block.type === 'tool_result') {
            const rawText = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
            if (rawText.length > threshold) {
              metrics.toolResultsStubbed++;
              let stubText = `[Tool Result: ~${rawText.length} chars pruned]`;
              if (enableCCR) {
                const hash = saveCCR(rawText, 'tool_result', `Historical tool result at turn ${idx}`);
                metrics.ccrEntriesCreated++;
                stubText = formatRetrievalStub(hash, 'Tool Result Payload', rawText.length);
              }
              return { ...block, content: stubText };
            }
          }
          return block;
        });
        content = filteredBlocks;
      } else if (typeof content === 'string' && content.length > threshold * 3) {
        // String tool dump
        if (/^\[\{|^\{|\b(diff --git|package |import |func |def )\b/.test(content)) {
          metrics.toolResultsStubbed++;
          let stubText = `[Long payload of ~${content.length} chars pruned]`;
          if (enableCCR) {
            const hash = saveCCR(content, 'text_block', `Historical text dump at turn ${idx}`);
            metrics.ccrEntriesCreated++;
            stubText = formatRetrievalStub(hash, 'Historical Dump', content.length);
          }
          content = stubText;
        }
      }

      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const newTokens = estimateTokenCount(contentStr);

      return {
        ...msg,
        content,
        tokens: newTokens,
      };
    });

    const turnTokens = newMessages.reduce((sum, m) => sum + (m.tokens || 0), 0);
    trimmedTurns.push({
      ...turn,
      messages: newMessages,
      tokens: turnTokens,
      isPruned: true,
    });
  }

  const finalTokens = trimmedTurns.reduce((sum, t) => sum + t.tokens, 0);
  metrics.trimmedTokens = finalTokens;
  metrics.tokensSaved = Math.max(0, metrics.originalTokens - finalTokens);

  return {
    session: {
      ...session,
      turns: trimmedTurns,
      totalTokens: finalTokens,
      updatedAt: Date.now(),
    },
    metrics,
  };
}
