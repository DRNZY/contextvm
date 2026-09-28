// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as readline from 'node:readline';
import { SessionAdapter } from './adapter.js';
import { SessionData, SessionTurn, SessionMessage } from '../../types/index.js';
import { estimateTokenCount } from '../packager/tokenizer.js';

export class AntigravitySessionAdapter implements SessionAdapter {
  detect(filePath: string): boolean {
    return filePath.includes('antigravity') && (filePath.endsWith('transcript.jsonl') || filePath.endsWith('.jsonl'));
  }

  async loadSession(filePath: string): Promise<SessionData> {
    const turns: SessionTurn[] = [];
    const sessionId = path.basename(path.dirname(filePath)) || 'antigravity-session';
    let turnIndex = 0;
    let totalTokens = 0;

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const step = JSON.parse(line);
        const role = step.source === 'USER_EXPLICIT' || step.type === 'USER_INPUT' ? 'user' : 'assistant';
        const contentStr = typeof step.content === 'string' ? step.content : JSON.stringify(step.content || step.tool_calls || '');
        const tokens = estimateTokenCount(contentStr);
        totalTokens += tokens;

        turns.push({
          turnIndex: turnIndex++,
          messages: [{
            id: `step-${step.step_index ?? turnIndex}`,
            role,
            content: step.content || step.tool_calls,
            timestamp: step.created_at ? new Date(step.created_at).getTime() : Date.now(),
            tokens,
          }],
          tokens,
          toolResultsCount: step.tool_calls ? step.tool_calls.length : 0,
        });
      } catch {}
    }

    const stat = fs.statSync(filePath);
    return {
      sessionId,
      agentType: 'antigravity',
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
          source: msg.role === 'user' ? 'USER_EXPLICIT' : 'MODEL',
          type: msg.role === 'user' ? 'USER_INPUT' : 'PLANNER_RESPONSE',
          content: msg.content,
        }) + '\n');
      }
    }
    writeStream.end();
    return outPath;
  }

  async listSessions(): Promise<SessionData[]> {
    const baseDir = path.join(os.homedir(), '.gemini', 'antigravity', 'brain');
    if (!fs.existsSync(baseDir)) return [];

    const dirs = fs.readdirSync(baseDir);
    const sessions: SessionData[] = [];
    for (const d of dirs.slice(0, 15)) {
      const logFile = path.join(baseDir, d, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(logFile)) {
        try {
          const s = await this.loadSession(logFile);
          sessions.push(s);
        } catch {}
      }
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }
}
