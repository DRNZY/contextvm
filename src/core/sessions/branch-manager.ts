// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SessionData } from '../../types/index.js';

function getBranchesDir(): string {
  const dir = path.join(os.homedir(), '.cvm', 'branches');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function createSnapshot(session: SessionData, snapshotName: string): string {
  const dir = getBranchesDir();
  const filePath = path.join(dir, `${snapshotName}.json`);

  const snapshot = {
    ...session,
    branchName: snapshotName,
    createdAt: Date.now(),
  };

  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
  return filePath;
}

export function listSnapshots(): string[] {
  const dir = getBranchesDir();
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
}

export function loadSnapshot(snapshotName: string): SessionData | null {
  const dir = getBranchesDir();
  const filePath = path.join(dir, `${snapshotName}.json`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as SessionData;
  } catch {
    return null;
  }
}
