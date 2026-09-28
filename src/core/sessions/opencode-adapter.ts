// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SessionAdapter } from './adapter.js';
import { SessionData, SessionTurn, SessionMessage } from '../../types/index.js';
import { estimateTokenCount } from '../packager/tokenizer.js';

export class OpenCodeSessionAdapter implements SessionAdapter {
  detect(filePath: string): boolean {
    return filePath.includes('.opencode') || filePath.includes('opencode');
  }

  async loadSession(filePath: string): Promise<SessionData> {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const sessionId = path.basename(filePath, path.extname(filePath));
    const turns: SessionTurn[] = [];
    let totalTokens = 0;

    try {
      const data = JSON.parse(raw);
      const messages = Array.isArray(data) ? data : data.messages || [];

      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const contentStr = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        const tokens = estimateTokenCount(contentStr);
        totalTokens += tokens;

        turns.push({
          turnIndex: i,
          messages: [{
            id: m.id || `opencode-${i}`,
            role: m.role || (i % 2 === 0 ? 'user' : 'assistant'),
            content: m.content,
            timestamp: m.timestamp || Date.now(),
            tokens,
          }],
          tokens,
          toolResultsCount: m.tool_results ? m.tool_results.length : 0,
        });
      }
    } catch {}

    const stat = fs.statSync(filePath);
    return {
      sessionId,
      agentType: 'opencode',
      filePath,
      turns,
      totalTokens,
      createdAt: stat.birthtimeMs || stat.mtimeMs,
      updatedAt: stat.mtimeMs,
    };
  }

  async saveSession(session: SessionData, targetPath?: string): Promise<string> {
    const outPath = targetPath || session.filePath;
    const messages = session.turns.flatMap(t => t.messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
    })));
    fs.writeFileSync(outPath, JSON.stringify({ messages }, null, 2), 'utf-8');
    return outPath;
  }

  async listSessions(): Promise<SessionData[]> {
    const baseDir = path.join(os.homedir(), '.local', 'share', 'opencode', 'sessions');
    if (!fs.existsSync(baseDir)) return [];

    const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.json') || f.endsWith('.jsonl'));
    const sessions: SessionData[] = [];
    for (const file of files.slice(0, 20)) {
      try {
        const s = await this.loadSession(path.join(baseDir, file));
        sessions.push(s);
      } catch {}
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
