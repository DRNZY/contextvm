// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { ClaudeSessionAdapter } from './claude-adapter.js';
import { OpenCodeSessionAdapter } from './opencode-adapter.js';
import { AntigravitySessionAdapter } from './antigravity-adapter.js';
import { SessionAdapter } from './adapter.js';

export * from './adapter.js';
export * from './claude-adapter.js';
export * from './opencode-adapter.js';
export * from './antigravity-adapter.js';
export * from './trimmer.js';
export * from './branch-manager.js';
export * from './tree-builder.js';

const adapters: SessionAdapter[] = [
  new ClaudeSessionAdapter(),
  new OpenCodeSessionAdapter(),
  new AntigravitySessionAdapter(),
];

export function getSessionAdapter(filePath: string): SessionAdapter {
  for (const adapter of adapters) {
    if (adapter.detect(filePath)) {
      return adapter;
    }
  }
  return new ClaudeSessionAdapter();
}

export async function loadAnySession(filePath: string) {
  const adapter = getSessionAdapter(filePath);
  return adapter.loadSession(filePath);
}
