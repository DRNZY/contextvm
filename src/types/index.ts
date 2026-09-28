// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

export type SupportedLanguage = 'typescript' | 'javascript' | 'python' | 'rust' | 'go' | 'json' | 'markdown' | 'text';

export interface SkeletonOptions {
  preserveDocstrings?: boolean;
  preserveTypes?: boolean;
  preserveExportsOnly?: boolean;
  maxLinesPerBody?: number;
  replacementComment?: string;
}

export interface CompressionOptions {
  contentType?: 'auto' | 'code' | 'json' | 'logs' | 'prose';
  language?: SupportedLanguage;
  maxTokens?: number;
  preserveErrors?: boolean;
  enableCCR?: boolean;
  preserveCachePrefix?: boolean;
  skeletonOptions?: SkeletonOptions;
}

export interface CompressionResult {
  compressed: string;
  originalSize: number;
  compressedSize: number;
  originalTokens: number;
  compressedTokens: number;
  tokensSaved: number;
  ratio: number;
  contentType: string;
  retrievalHash?: string;
}

export interface CCRPayload {
  hash: string;
  createdAt: number;
  contentType: string;
  originalSize: number;
  content: string;
  summary: string;
}

export interface PackOptions {
  maxTokens: number;
  model?: string;
  includeGlobs?: string[];
  excludeGlobs?: string[];
  skeletonizeCode?: boolean;
  preservePriorityFiles?: string[];
}

export interface PackedFile {
  path: string;
  content: string;
  tokens: number;
  skeletonized: boolean;
  priority: number;
}

export interface PackResult {
  files: PackedFile[];
  totalTokens: number;
  budgetTokens: number;
  utilization: number;
  omittedFiles: string[];
}

export interface SessionMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: any;
  timestamp?: number;
  tokens?: number;
}

export interface SessionTurn {
  turnIndex: number;
  messages: SessionMessage[];
  tokens: number;
  toolResultsCount: number;
  isPruned?: boolean;
}

export interface SessionData {
  sessionId: string;
  agentType: 'claude' | 'opencode' | 'antigravity' | 'generic';
  filePath: string;
  turns: SessionTurn[];
  totalTokens: number;
  createdAt: number;
  updatedAt: number;
  parentSessionId?: string;
  branchName?: string;
  tags?: string[];
}

export interface TrimMetrics {
  originalTokens: number;
  trimmedTokens: number;
  tokensSaved: number;
  toolResultsStubbed: number;
  imagesStripped: number;
  thinkingBlocksPruned: number;
  ccrEntriesCreated: number;
}

export interface ProxyStats {
  requestsTotal: number;
  tokensInputOriginal: number;
  tokensInputCompressed: number;
  tokensSaved: number;
  avgCompressionRatio: number;
  ccrRetrievals: number;
  cacheHitRatio: number;
  uptimeSeconds: number;
}
