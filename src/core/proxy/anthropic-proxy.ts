// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { compress } from '../compressor/index.js';
import { estimateTokenCount } from '../packager/tokenizer.js';
import { saveCCR } from '../ccr/store.js';
import { formatRetrievalStub } from '../ccr/retriever.js';

export function compressAnthropicPayload(body: any): { body: any; tokensSaved: number } {
  if (!body || !Array.isArray(body.messages)) {
    return { body, tokensSaved: 0 };
  }

  let totalOriginal = 0;
  let totalCompressed = 0;

  const msgCount = body.messages.length;

  body.messages = body.messages.map((msg: any, idx: number) => {
    // Preserve recent 2 turns untouched to protect assistant flow
    if (idx >= msgCount - 2) {
      return msg;
    }

    if (Array.isArray(msg.content)) {
      msg.content = msg.content.map((block: any) => {
        if (block.type === 'tool_result') {
          const raw = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
          const origTokens = estimateTokenCount(raw);
          totalOriginal += origTokens;

          if (raw.length > 500) {
            const res = compress(raw, { contentType: 'auto', enableCCR: true });
            const hash = saveCCR(raw, res.contentType, `Tool Result at Turn ${idx}`);
            const stub = formatRetrievalStub(hash, `Compressed ${res.contentType}`, raw.length);
            totalCompressed += estimateTokenCount(stub);
            return { ...block, content: stub };
          } else {
            totalCompressed += origTokens;
          }
        }
        return block;
      });
    }

    return msg;
  });

  const tokensSaved = Math.max(0, totalOriginal - totalCompressed);
  return { body, tokensSaved };
}
