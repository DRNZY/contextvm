// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { CCRPayload } from '../../types/index.js';

function getVaultDir(): string {
  const dir = path.join(os.homedir(), '.cvm', 'ccr-vault');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function saveCCR(content: string, contentType: string, summary: string): string {
  const hash = crypto.createHash('sha256').update(content, 'utf-8').digest('hex').substring(0, 16);
  const vaultDir = getVaultDir();
  const filePath = path.join(vaultDir, `${hash}.json`);

  const payload: CCRPayload = {
    hash,
    createdAt: Date.now(),
    contentType,
    originalSize: Buffer.byteLength(content, 'utf-8'),
    content,
    summary,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
  return hash;
}

export function getCCR(hash: string): CCRPayload | null {
  const vaultDir = getVaultDir();
  const filePath = path.join(vaultDir, `${hash}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as CCRPayload;
  } catch {
    return null;
  }
}

export function listCCR(): CCRPayload[] {
  const vaultDir = getVaultDir();
  if (!fs.existsSync(vaultDir)) return [];
  const files = fs.readdirSync(vaultDir).filter(f => f.endsWith('.json'));
  const results: CCRPayload[] = [];
  for (const f of files) {
    try {
      const raw = fs.readFileSync(path.join(vaultDir, f), 'utf-8');
      results.push(JSON.parse(raw));
    } catch {}
  }
  return results.sort((a, b) => b.createdAt - a.createdAt);
}
