// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SessionData } from '../../types/index.js';

export function buildSessionTreeAscii(sessions: SessionData[]): string {
  if (sessions.length === 0) {
    return 'No sessions tracked in ContextVM.';
  }

  const lines: string[] = ['Context Lineage Tree:'];

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const isLast = i === sessions.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    const date = new Date(s.updatedAt).toISOString().replace('T', ' ').substring(0, 16);
    const tokens = `${Math.round(s.totalTokens / 1000)}k tokens`;
    const agent = `[${s.agentType}]`;
    const branch = s.branchName ? ` (branch: ${s.branchName})` : '';

    lines.push(`${prefix}${s.sessionId} ${agent} • ${tokens} • ${date}${branch}`);
  }

  return lines.join('\n');
}
