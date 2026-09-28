// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { saveCCR, getCCR } from '../src/core/ccr/store.js';
import { retrievePayload } from '../src/core/ccr/retriever.js';

describe('Content Cache & Retrieval (CCR)', () => {
  it('stores payloads in local vault and retrieves by hash', () => {
    const content = 'Full uncompressed source code with 10,000 lines of data';
    const hash = saveCCR(content, 'test', 'Test Payload');

    expect(hash).toBeDefined();
    expect(hash.length).toBe(16);

    const retrieved = retrievePayload(hash);
    expect(retrieved).toBe(content);
  });

  it('returns graceful error for non-existent hash', () => {
    const res = retrievePayload('non_existent_hash_123');
    expect(res).toContain('ContextVM Error: Payload with hash');
  });
});
