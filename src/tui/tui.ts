// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SessionData } from '../types/index.js';

export function renderSessionOverview(session: SessionData): string {
  const lines: string[] = [];
  lines.push('===============================================================');
  lines.push(` ContextVM - Session Overview: ${session.sessionId}`);
  lines.push('===============================================================');
  lines.push(` Agent Type   : ${session.agentType}`);
  lines.push(` File Path    : ${session.filePath}`);
  lines.push(` Total Turns  : ${session.turns.length}`);
  lines.push(` Total Tokens : ~${session.totalTokens.toLocaleString()}`);
  lines.push('---------------------------------------------------------------');
  lines.push(' Turn Breakdown:');
  lines.push('---------------------------------------------------------------');

  for (const turn of session.turns) {
    const role = turn.messages[0]?.role || 'unknown';
    const toolBadge = turn.toolResultsCount > 0 ? ` [${turn.toolResultsCount} tool results]` : '';
    const prunedBadge = turn.isPruned ? ' (PRUNED)' : '';
    const preview = typeof turn.messages[0]?.content === 'string'
      ? turn.messages[0].content.substring(0, 60).replace(/\n/g, ' ')
      : '[Structured Payload]';

    lines.push(` Turn ${turn.turnIndex.toString().padStart(2, ' ')} | ${role.padEnd(9, ' ')} | ~${turn.tokens.toString().padStart(5, ' ')} tok | ${preview}${toolBadge}${prunedBadge}`);
  }

  lines.push('===============================================================');
  return lines.join('\n');
}
