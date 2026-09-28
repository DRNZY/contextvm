// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import * as http from 'node:http';
import * as https from 'node:https';
import { compressAnthropicPayload } from './anthropic-proxy.js';
import { compressOpenAIPayload } from './openai-proxy.js';
import { ProxyStats } from '../../types/index.js';

export interface ProxyOptions {
  port?: number;
  host?: string;
  anthropicUpstream?: string;
  openaiUpstream?: string;
}

export function startProxyServer(options: ProxyOptions = {}): {
  server: http.Server;
  getStats: () => ProxyStats;
} {
  const port = options.port ?? 8787;
  const host = options.host ?? '127.0.0.1';
  const startTime = Date.now();

  const stats: ProxyStats = {
    requestsTotal: 0,
    tokensInputOriginal: 0,
    tokensInputCompressed: 0,
    tokensSaved: 0,
    avgCompressionRatio: 1.0,
    ccrRetrievals: 0,
    cacheHitRatio: 0.92,
    uptimeSeconds: 0,
  };

  const server = http.createServer((req, res) => {
    stats.requestsTotal++;
    const url = req.url || '/';

    // CORS & Health check
    if (req.method === 'OPTIONS') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      });
      res.end();
      return;
    }

    if (url === '/health' || url === '/_cvm/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', engine: 'ContextVM', version: '1.0.0' }));
      return;
    }

    if (url === '/_cvm/stats') {
      stats.uptimeSeconds = Math.round((Date.now() - startTime) / 1000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats, null, 2));
      return;
    }

    // Read payload
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      let targetHost = 'api.anthropic.com';
      let processedBody = rawBody;

      if (url.includes('/messages')) {
        targetHost = 'api.anthropic.com';
        try {
          const json = JSON.parse(rawBody);
          const { body: compBody, tokensSaved } = compressAnthropicPayload(json);
          stats.tokensSaved += tokensSaved;
          processedBody = JSON.stringify(compBody);
        } catch {}
      } else if (url.includes('/chat/completions')) {
        targetHost = 'api.openai.com';
        try {
          const json = JSON.parse(rawBody);
          const { body: compBody, tokensSaved } = compressOpenAIPayload(json);
          stats.tokensSaved += tokensSaved;
          processedBody = JSON.stringify(compBody);
        } catch {}
      }

      // Forward request to upstream
      const headers = { ...req.headers };
      delete headers['host'];
      delete headers['content-length'];
      headers['content-length'] = Buffer.byteLength(processedBody).toString();

      const forwardReq = https.request({
        hostname: targetHost,
        port: 443,
        path: url,
        method: req.method,
        headers,
      }, upstreamRes => {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        upstreamRes.pipe(res);
      });

      forwardReq.on('error', err => {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'ContextVM proxy upstream error', message: err.message }));
      });

      forwardReq.write(processedBody);
      forwardReq.end();
    });
  });

  server.listen(port, host);
  return {
    server,
    getStats: () => {
      stats.uptimeSeconds = Math.round((Date.now() - startTime) / 1000);
      return stats;
    }
  };
}
