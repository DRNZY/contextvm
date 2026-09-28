// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { getCCR } from './store.js';

export function formatRetrievalStub(hash: string, summary: string, charLength: number): string {
  return `[Content cached in ContextVM CCR Vault. Hash: ${hash} | Summary: ${summary} | Size: ~${charLength} chars. Call cvm_retrieve('${hash}') if full text is required.]`;
}

export function retrievePayload(hash: string): string {
  const item = getCCR(hash);
  if (!item) {
    return `[ContextVM Error: Payload with hash '${hash}' was not found in the local CCR vault.]`;
  }
  return item.content;
}
