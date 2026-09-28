// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SessionData } from '../../types/index.js';

export interface SessionAdapter {
  detect(filePath: string): boolean;
  loadSession(filePath: string): Promise<SessionData>;
  saveSession(session: SessionData, targetPath?: string): Promise<string>;
  listSessions(): Promise<SessionData[]>;
}
