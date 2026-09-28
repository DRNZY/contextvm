// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { compress } from '../compressor/index.js';
import { skeletonizeCode, detectLanguageFromPath } from '../skeletonizer/index.js';
import { retrievePayload } from '../ccr/retriever.js';
import { packDirectory } from '../packager/budget-packer.js';
import { estimateTokenCount } from '../packager/tokenizer.js';

export function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'contextvm',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'context_compress',
        description: 'Compresses payload (code, JSON, logs, tool results) to save tokens while preserving critical structure.',
        inputSchema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Raw content to compress' },
            contentType: { type: 'string', enum: ['auto', 'code', 'json', 'logs', 'prose'], default: 'auto' },
            enableCCR: { type: 'boolean', description: 'Cache full payload in local vault for reversible retrieval', default: true },
          },
          required: ['content'],
        },
      },
      {
        name: 'context_skeletonize',
        description: 'Extracts AST signatures, types, and interfaces from code while pruning implementations.',
        inputSchema: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Source code' },
            language: { type: 'string', enum: ['typescript', 'javascript', 'python', 'rust', 'go'], default: 'typescript' },
            preserveDocstrings: { type: 'boolean', default: true },
          },
          required: ['code'],
        },
      },
      {
        name: 'context_retrieve',
        description: 'Retrieves an uncompressed original payload from the ContextVM CCR vault using its hash.',
        inputSchema: {
          type: 'object',
          properties: {
            hash: { type: 'string', description: '16-character SHA-256 retrieval hash' },
          },
          required: ['hash'],
        },
      },
      {
        name: 'context_pack',
        description: 'Packs an entire repository or directory into a strict token budget with greedy priority scoring.',
        inputSchema: {
          type: 'object',
          properties: {
            directory: { type: 'string', description: 'Absolute directory path to pack' },
            maxTokens: { type: 'number', description: 'Token budget ceiling (e.g. 32000)', default: 32000 },
            skeletonizeCode: { type: 'boolean', default: true },
          },
          required: ['directory'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === 'context_compress') {
      const { content, contentType, enableCCR } = args as any;
      const res = compress(content, { contentType, enableCCR });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }

    if (name === 'context_skeletonize') {
      const { code, language, preserveDocstrings } = args as any;
      const res = skeletonizeCode(code, language || 'typescript', { preserveDocstrings });
      return {
        content: [
          {
            type: 'text',
            text: res,
          },
        ],
      };
    }

    if (name === 'context_retrieve') {
      const { hash } = args as any;
      const content = retrievePayload(hash);
      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    }

    if (name === 'context_pack') {
      const { directory, maxTokens, skeletonizeCode } = args as any;
      const res = packDirectory(directory, { maxTokens: maxTokens || 32000, skeletonizeCode });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown ContextVM MCP tool: ${name}`);
  });

  return server;
}

export async function runMCPServerStdio() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
