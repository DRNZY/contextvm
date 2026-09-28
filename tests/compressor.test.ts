// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { crushJson } from '../src/core/compressor/json-crusher.js';
import { trimLogs } from '../src/core/compressor/log-trimmer.js';
import { compress } from '../src/core/compressor/index.js';

describe('Compressor Engine', () => {
  it('compresses JSON arrays while retaining structure and sample items', () => {
    const data = JSON.stringify([
      { id: 1, name: 'Alice', bio: 'Lorem ipsum dolor sit amet '.repeat(10) },
      { id: 2, name: 'Bob', bio: 'Lorem ipsum dolor sit amet '.repeat(10) },
      { id: 3, name: 'Charlie', bio: 'Lorem ipsum dolor sit amet '.repeat(10) },
      { id: 4, name: 'David', bio: 'Lorem ipsum dolor sit amet '.repeat(10) },
      { id: 5, name: 'Eve', bio: 'Lorem ipsum dolor sit amet '.repeat(10) },
    ]);

    const crushed = crushJson(data, { maxArrayItems: 2 });
    expect(crushed).toContain('Alice');
    expect(crushed).toContain('Bob');
    expect(crushed).toContain('additional array items omitted by ContextVM');
    expect(crushed.length).toBeLessThan(data.length);
  });

  it('squashes routine logs while preserving fatal error and traceback frames', () => {
    const logs = `
2026-09-28 10:00:01 INFO Server started on port 8080
2026-09-28 10:00:02 INFO Health check ping OK
2026-09-28 10:00:03 INFO Health check ping OK
2026-09-28 10:00:04 INFO Health check ping OK
2026-09-28 10:00:05 INFO Health check ping OK
2026-09-28 10:00:06 INFO Health check ping OK
2026-09-28 10:00:07 ERROR Database connection pool exhausted
    at Pool.acquire (/app/db.js:45)
2026-09-28 10:00:08 INFO Retrying connection in 5s
2026-09-28 10:00:09 INFO Health check ping OK
2026-09-28 10:00:10 INFO Health check ping OK
2026-09-28 10:00:11 INFO Health check ping OK
2026-09-28 10:00:12 INFO Health check ping OK
2026-09-28 10:00:13 INFO Health check ping OK
2026-09-28 10:00:14 INFO Health check ping OK
2026-09-28 10:00:15 INFO Health check ping OK
2026-09-28 10:00:16 INFO Health check ping OK
2026-09-28 10:00:17 INFO Health check ping OK
2026-09-28 10:00:18 INFO Health check ping OK
2026-09-28 10:00:19 INFO Health check ping OK
2026-09-28 10:00:20 INFO Health check ping OK
2026-09-28 10:00:21 FATAL Unrecoverable kernel panic
`;
    const trimmed = trimLogs(logs, { maxConsecutiveInfo: 2 });
    expect(trimmed).toContain('ERROR Database connection pool exhausted');
    expect(trimmed).toContain('FATAL Unrecoverable kernel panic');
    expect(trimmed).toContain('skipped');
    expect(trimmed.length).toBeLessThan(logs.length);
  });

  it('runs unified compress() pipeline with automatic category detection', () => {
    const code = `
export function greet(name: string): string {
  console.log('hello');
  return 'Hello ' + name;
}
`;
    const res = compress(code, { contentType: 'auto', enableCCR: true });
    expect(res.contentType).toBe('code');
    expect(res.tokensSaved).toBeGreaterThanOrEqual(0);
    expect(res.compressed).toContain('export function greet(name: string): string');
  });
});
