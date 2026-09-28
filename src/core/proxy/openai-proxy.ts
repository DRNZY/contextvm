// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { compress } from '../compressor/index.js';
import { estimateTokenCount } from '../packager/tokenizer.js';
import { saveCCR } from '../ccr/store.js';
import { formatRetrievalStub } from '../ccr/retriever.js';

export function compressOpenAIPayload(body: any): { body: any; tokensSaved: number } {
  if (!body || !Array.isArray(body.messages)) {
    return { body, tokensSaved: 0 };
  }

  let totalOriginal = 0;
  let totalCompressed = 0;
  const msgCount = body.messages.length;

  body.messages = body.messages.map((msg: any, idx: number) => {
    if (idx >= msgCount - 2 || msg.role === 'system') {
      return msg;
    }

    if (typeof msg.content === 'string' && msg.content.length > 600) {
      const origTokens = estimateTokenCount(msg.content);
      totalOriginal += origTokens;

      const res = compress(msg.content, { contentType: 'auto', enableCCR: true });
      if (res.tokensSaved > 0) {
        const hash = saveCCR(msg.content, res.contentType, `Message Content at Turn ${idx}`);
        const stub = formatRetrievalStub(hash, `Compressed ${res.contentType}`, msg.content.length);
        totalCompressed += estimateTokenCount(stub);
        return { ...msg, content: stub };
      } else {
        totalCompressed += origTokens;
      }
    }

    return msg;
  });

  const tokensSaved = Math.max(0, totalOriginal - totalCompressed);
  return { body, tokensSaved };
}
