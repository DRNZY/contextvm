#!/usr/bin/env node
// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { runMCPServerStdio } from '../core/mcp/server.js';

runMCPServerStdio().catch(err => {
  console.error('Fatal ContextVM MCP error:', err);
  process.exit(1);
});
