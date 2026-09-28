// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as readline from 'node:readline';
import { SessionAdapter } from './adapter.js';
import { SessionData, SessionTurn, SessionMessage } from '../../types/index.js';
import { estimateTokenCount } from '../packager/tokenizer.js';

export class ClaudeSessionAdapter implements SessionAdapter {
  detect(filePath: string): boolean {
    return filePath.includes('.claude/sessions') || filePath.endsWith('.jsonl');
  }

  async loadSession(filePath: string): Promise<SessionData> {
    const turns: SessionTurn[] = [];
    const sessionId = path.basename(filePath, '.jsonl');
    let turnIndex = 0;
    let totalTokens = 0;

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        if (item.type === 'message' || item.role) {
          const contentStr = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
          const tokens = estimateTokenCount(contentStr);
          totalTokens += tokens;

          let toolResults = 0;
          if (Array.isArray(item.content)) {
            toolResults = item.content.filter((c: any) => c.type === 'tool_result').length;
          }

          const msg: SessionMessage = {
            id: item.id || `msg-${turnIndex}`,
            role: item.role || 'user',
            content: item.content,
            timestamp: item.timestamp || Date.now(),
            tokens,
          };

          turns.push({
            turnIndex: turnIndex++,
            messages: [msg],
            tokens,
            toolResultsCount: toolResults,
          });
        }
      } catch {}
    }

    const stat = fs.statSync(filePath);
    return {
      sessionId,
      agentType: 'claude',
      filePath,
      turns,
      totalTokens,
      createdAt: stat.birthtimeMs || stat.mtimeMs,
      updatedAt: stat.mtimeMs,
    };
  }

  async saveSession(session: SessionData, targetPath?: string): Promise<string> {
    const outPath = targetPath || session.filePath;
    const writeStream = fs.createWriteStream(outPath, { encoding: 'utf-8' });

    for (const turn of session.turns) {
      for (const msg of turn.messages) {
        writeStream.write(JSON.stringify({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }) + '\n');
      }
    }
    writeStream.end();
    return outPath;
  }

  async listSessions(): Promise<SessionData[]> {
    const baseDir = path.join(os.homedir(), '.claude', 'sessions');
    if (!fs.existsSync(baseDir)) return [];

    const files = fs.readdirSync(baseDir).filter(f => f.endsWith('.jsonl'));
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
