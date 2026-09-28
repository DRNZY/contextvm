// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { SessionMessage } from '../../types/index.js';

export function alignCachePrefix(messages: SessionMessage[], prefixTurnsCount: number = 2): {
  prefix: SessionMessage[];
  dynamic: SessionMessage[];
} {
  if (messages.length <= prefixTurnsCount) {
    return { prefix: messages, dynamic: [] };
  }
  return {
    prefix: messages.slice(0, prefixTurnsCount),
    dynamic: messages.slice(prefixTurnsCount),
  };
}
