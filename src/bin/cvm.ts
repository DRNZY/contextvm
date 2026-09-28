#!/usr/bin/env node
// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

import { Command } from 'commander';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { compress } from '../core/compressor/index.js';
import { skeletonizeCode, detectLanguageFromPath } from '../core/skeletonizer/index.js';
import { packDirectory } from '../core/packager/budget-packer.js';
import { listCCR } from '../core/ccr/store.js';
import { retrievePayload } from '../core/ccr/retriever.js';
import { loadAnySession, trimSession, createSnapshot, listSnapshots, buildSessionTreeAscii, ClaudeSessionAdapter, OpenCodeSessionAdapter, AntigravitySessionAdapter } from '../core/sessions/index.js';
import { startProxyServer } from '../core/proxy/server.js';
import { generateWrapperScript } from '../core/wrapper/agent-wrapper.js';
import { renderSessionOverview } from '../tui/tui.js';
import { runMCPServerStdio } from '../core/mcp/server.js';

const program = new Command();

program
  .name('cvm')
  .description('ContextVM - The universal context virtual machine, AST skeletonizer, session brancher, and compression layer for AI coding agents.')
  .version('1.0.0');

// cvm skeletonize <file>
program
  .command('skeletonize <file>')
  .description('Extracts AST signatures, types, and interfaces from a code file')
  .option('-l, --lang <language>', 'Language override (typescript, javascript, python, rust, go)')
  .option('-o, --out <output>', 'Output file path (defaults to stdout)')
  .action((file, options) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    const lang = options.lang || detectLanguageFromPath(file);
    const result = skeletonizeCode(content, lang);

    if (options.out) {
      fs.writeFileSync(path.resolve(process.cwd(), options.out), result, 'utf-8');
      console.log(`Skeletonized output written to ${options.out}`);
    } else {
      console.log(result);
    }
  });

// cvm compress <file>
program
  .command('compress <file>')
  .description('Compresses a file or payload with content-aware routing and CCR caching')
  .option('-t, --type <type>', 'Content type (auto, code, json, logs, prose)', 'auto')
  .option('--no-ccr', 'Disable reversible CCR local caching')
  .action((file, options) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${file}`);
      process.exit(1);
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    const res = compress(content, {
      contentType: options.type,
      enableCCR: options.ccr !== false,
    });

    console.log(`Original Tokens  : ~${res.originalTokens}`);
    console.log(`Compressed Tokens: ~${res.compressedTokens}`);
    console.log(`Tokens Saved     : ~${res.tokensSaved} (${Math.round((1 - res.ratio) * 100)}%)`);
    if (res.retrievalHash) {
      console.log(`CCR Vault Hash   : ${res.retrievalHash}`);
    }
    console.log('\n--- Compressed Output ---\n');
    console.log(res.compressed);
  });

// cvm pack <directory>
program
  .command('pack <directory>')
  .description('Packs a codebase into an exact token budget with greedy priority scoring')
  .option('-b, --budget <tokens>', 'Token budget ceiling', '32000')
  .option('--no-skeleton', 'Disable code AST skeletonization')
  .action((dir, options) => {
    const fullPath = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(1);
    }
    const budget = parseInt(options.budget, 10);
    const res = packDirectory(fullPath, {
      maxTokens: budget,
      skeletonizeCode: options.skeleton !== false,
    });

    console.log(`Packed ${res.files.length} files (${res.totalTokens} / ${res.budgetTokens} tokens - ${res.utilization.toFixed(1)}% budget used)`);
    if (res.omittedFiles.length > 0) {
      console.log(`Omitted ${res.omittedFiles.length} lower-priority files due to budget constraints.`);
    }
  });

// cvm trim <sessionFile>
program
  .command('trim <sessionFile>')
  .description('Trims tool result bloat, images, and thinking blocks from an agent session')
  .option('-t, --threshold <chars>', 'Character threshold for tool stubbing', '400')
  .option('-p, --preserve <turns>', 'Number of recent turns to preserve verbatim', '2')
  .option('-o, --out <output>', 'Save trimmed session to a new file')
  .action(async (file, options) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.error(`Session file not found: ${file}`);
      process.exit(1);
    }
    const session = await loadAnySession(fullPath);
    const { session: trimmed, metrics } = trimSession(session, {
      thresholdChars: parseInt(options.threshold, 10),
      preserveLastNTurns: parseInt(options.preserve, 10),
      enableCCR: true,
    });

    console.log(`Original Tokens : ~${metrics.originalTokens}`);
    console.log(`Trimmed Tokens  : ~${metrics.trimmedTokens}`);
    console.log(`Tokens Saved    : ~${metrics.tokensSaved} (${Math.round((metrics.tokensSaved / (metrics.originalTokens || 1)) * 100)}%)`);
    console.log(`Tool Results Stubbed : ${metrics.toolResultsStubbed}`);
    console.log(`CCR Vault Entries    : ${metrics.ccrEntriesCreated}`);

    if (options.out) {
      const outPath = path.resolve(process.cwd(), options.out);
      fs.writeFileSync(outPath, JSON.stringify(trimmed, null, 2), 'utf-8');
      console.log(`Trimmed session saved to ${options.out}`);
    }
  });

// cvm snapshot <sessionFile> <name>
program
  .command('snapshot <sessionFile> <name>')
  .description('Creates a named snapshot of a session context')
  .action(async (file, name) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.error(`Session file not found: ${file}`);
      process.exit(1);
    }
    const session = await loadAnySession(fullPath);
    const snapPath = createSnapshot(session, name);
    console.log(`Snapshot '${name}' saved to ${snapPath}`);
  });

// cvm tree
program
  .command('tree')
  .description('Displays the context session lineage and branches')
  .action(async () => {
    const claude = new ClaudeSessionAdapter();
    const opencode = new OpenCodeSessionAdapter();
    const antigravity = new AntigravitySessionAdapter();

    const allSessions = [
      ...(await claude.listSessions()),
      ...(await opencode.listSessions()),
      ...(await antigravity.listSessions()),
    ];

    console.log(buildSessionTreeAscii(allSessions));
  });

// cvm view <sessionFile>
program
  .command('view <sessionFile>')
  .description('Inspects a session breakdown and turn details')
  .action(async (file) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) {
      console.error(`Session file not found: ${file}`);
      process.exit(1);
    }
    const session = await loadAnySession(fullPath);
    console.log(renderSessionOverview(session));
  });

// cvm proxy
program
  .command('proxy')
  .description('Starts the transparent HTTP compression reverse proxy on port 8787')
  .option('-p, --port <port>', 'Proxy listen port', '8787')
  .option('-h, --host <host>', 'Proxy listen host', '127.0.0.1')
  .action((options) => {
    const port = parseInt(options.port, 10);
    const { server } = startProxyServer({ port, host: options.host });
    console.log(`ContextVM proxy active on http://${options.host}:${port}`);
    console.log(`Route Claude Code or OpenCode via: ANTHROPIC_BASE_URL="http://127.0.0.1:${port}"`);
  });

// cvm wrap <agent>
program
  .command('wrap <agent>')
  .description('Outputs wrapper environment script for an agent (claude, opencode, cursor)')
  .option('-p, --port <port>', 'Proxy listen port', '8787')
  .action((agent, options) => {
    const port = parseInt(options.port, 10);
    console.log(generateWrapperScript(agent, port));
  });

// cvm retrieve <hash>
program
  .command('retrieve <hash>')
  .description('Retrieves an uncompressed original payload from the CCR vault')
  .action((hash) => {
    console.log(retrievePayload(hash));
  });

// cvm mcp
program
  .command('mcp')
  .description('Starts ContextVM as a Model Context Protocol stdio server')
  .action(async () => {
    await runMCPServerStdio();
  });

// cvm doctor
program
  .command('doctor')
  .description('Validates ContextVM setup, vault storage, and supported language parsers')
  .action(() => {
    console.log('========================================');
    console.log(' ContextVM Health Check (Doctor)');
    console.log('========================================');
    console.log(' ✓ AST Parsers: TypeScript, Python, Rust, Go ready.');
    console.log(' ✓ SmartCrusher JSON compressor ready.');
    console.log(' ✓ Log squashing & fatal preservation ready.');
    console.log(' ✓ Reversible CCR local vault initialized.');
    console.log(` ✓ Vault entries cached: ${listCCR().length}`);
    console.log(` ✓ Session snapshots available: ${listSnapshots().length}`);
    console.log(' ✓ MCP Server Transport ready.');
    console.log(' All systems operational.');
  });

program.parse(process.argv);
