// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest';
import { compressAnthropicPayload } from '../src/core/proxy/anthropic-proxy.js';
import { compressOpenAIPayload } from '../src/core/proxy/openai-proxy.js';

describe('Proxy Payloads Compression', () => {
  it('compresses historical tool results in Anthropic messages payload', () => {
    const body = {
      messages: [
        {
          role: 'user',
          content: 'Read file',
        },
        {
          role: 'assistant',
          content: [
            {
              type: 'tool_result',
              content: 'console.log("hello world");\n'.repeat(200),
            },
          ],
        },
        {
          role: 'user',
          content: 'Next turn query',
        },
        {
          role: 'assistant',
          content: 'Final response',
        },
      ],
    };

    const { body: compBody, tokensSaved } = compressAnthropicPayload(body);
    expect(tokensSaved).toBeGreaterThan(0);
    expect(compBody.messages[1].content[0].content).toContain('ContextVM CCR Vault');
  });

  it('compresses historical string blocks in OpenAI payload', () => {
    const body = {
      messages: [
        {
          role: 'user',
          content: 'Here is data: ' + JSON.stringify(Array(50).fill({ id: 1, name: 'Item', desc: 'Detailed description long text' })),
        },
        {
          role: 'assistant',
          content: 'Understood.',
        },
        {
          role: 'user',
          content: 'Recent prompt',
        },
      ],
    };

    const { body: compBody, tokensSaved } = compressOpenAIPayload(body);
    expect(tokensSaved).toBeGreaterThan(0);
    expect(compBody.messages[0].content).toContain('ContextVM CCR Vault');
  });
});
