# ContextVM (cvm)

ContextVM is an execution engine and context virtual machine designed for AI coding agents. It provides AST code skeletonization, content-aware lossless and lossy compression, reversible local vault caching, token budget packing, multi-agent session virtualization, and a transparent caching reverse proxy.

ContextVM combines the strengths of AST parsing, transparent HTTP proxying, session tree branching, and Model Context Protocol integration into a single zero-dependency TypeScript package.

## Architecture

ContextVM operates across five core subsystems:

1. AST Skeletonizer: Parses source code in TypeScript, Python, Rust, and Go to extract interface signatures, type definitions, exports, and function headers while omitting implementation bodies.
2. SmartCrusher and Compressor: Detects content categories automatically (JSON payloads, build and runtime logs, source code, prose) and applies targeted reduction. Large JSON arrays are sampled and truncated while preserving primary keys. Redundant log sequences are squashed while preserving fatal errors and stack traces.
3. Content Cache and Retrieval (CCR) Vault: Stores original, uncompressed payloads on local disk (`~/.contextvm/vault/`) keyed by SHA-256 hash. Truncated blocks are replaced with compact retrieval stubs. When an agent requires full context, it can retrieve original content on demand.
4. Session Virtualization and Branching: Normalizes session logs from Claude Code, OpenCode, and Antigravity into a unified turn graph. Supports creating named snapshots, visualizing conversation lineage trees, and trimming historical tool outputs.
5. Reverse Proxy and MCP Server: Runs a local proxy on port 8787 that compresses upstream API payloads for Anthropic and OpenAI protocols. Also exposes standard Model Context Protocol (MCP) tools for direct agent integration.

## Installation

ContextVM can be installed globally or run directly via npx.

```bash
# Clone and build locally
git clone https://github.com/DRNZY/contextvm.git
cd contextvm
npm install
npm run build
npm link

# Run directly
cvm --help
```

## CLI Commands

ContextVM exposes a complete set of command-line utilities.

### Skeletonize Code

Extract signatures and types from source code files to reduce context window usage:

```bash
# TypeScript / JavaScript
cvm skeletonize src/index.ts

# Python
cvm skeletonize app/main.py

# Rust
cvm skeletonize src/lib.rs

# Go
cvm skeletonize server.go

# Strip comments and docstrings
cvm skeletonize src/index.ts --no-comments
```

### Compress Content and Vault Caching

Compress arbitrary text files, JSON outputs, or logs with automatic category detection and CCR storage:

```bash
cvm compress output.json
cvm compress build.log --type logs
```

### Codebase Budget Packing

Pack an entire repository into a strict token budget using greedy priority scoring:

```bash
# Pack repository files into a 64k token budget
cvm pack . --budget 64000 --output packed-context.txt

# Pack with aggressive AST skeletonization
cvm pack . --budget 32000 --skeleton
```

### Session Trimming and Snapshotting

Clean up bloated agent session files by stripping oversized historical tool results:

```bash
# Inspect session turns and token footprint
cvm view ~/.claude/sessions/session-id.json

# Trim tool results exceeding 400 characters and write to cleaned file
cvm trim ~/.claude/sessions/session-id.json -o cleaned-session.json --max-length 400

# Create a named snapshot for instant restoration
cvm snapshot ~/.claude/sessions/session-id.json checkpoint-1

# View lineage tree across all snapshots and branches
cvm tree
```

### Transparent Reverse Proxy

Start the local compression proxy on port 8787:

```bash
cvm proxy --port 8787
```

To route Claude Code or OpenCode through ContextVM, set the upstream base URL:

```bash
# Claude Code
export ANTHROPIC_BASE_URL="http://127.0.0.1:8787"
claude

# OpenCode / OpenAI Compatible
export OPENAI_BASE_URL="http://127.0.0.1:8787/v1"
opencode
```

You can also generate agent wrapper configuration using:

```bash
cvm wrap claude
cvm wrap opencode
```

### Retrieve Vault Payloads

Inspect or restore uncompressed contents stored by CCR:

```bash
cvm retrieve <sha256_hash>
```

### System Health

Verify parsers, storage vaults, and MCP readiness:

```bash
cvm doctor
```

## MCP Server Configuration

ContextVM includes a Model Context Protocol stdio server that equips agents with context reduction tools.

Add the following to your agent configuration:

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "contextvm": {
      "command": "node",
      "args": ["/path/to/contextvm/dist/bin/mcp.js"]
    }
  }
}
```

### Antigravity (`~/.gemini/antigravity/mcp_config.json`)

```json
{
  "mcpServers": {
    "contextvm": {
      "command": "node",
      "args": ["/home/darnell/Projects/contextvm/dist/bin/mcp.js"]
    }
  }
}
```

### OpenCode

```json
{
  "mcp": {
    "contextvm": {
      "command": "contextvm-mcp"
    }
  }
}
```

### Available MCP Tools

* `skeletonize`: Extracts AST signatures from TypeScript, Python, Rust, or Go files.
* `compress`: Applies content-aware compression to JSON, logs, or code payloads and stores originals in the CCR vault.
* `pack_codebase`: Packs repository files into a strict token budget with priority ordering.
* `trim_session`: Compresses and cleans agent session histories.
* `retrieve_ccr`: Retrieves full original content from the local CCR vault by SHA-256 hash.
* `get_session_tree`: Returns the current lineage graph of session snapshots and branches.

## License and Attribution

ContextVM is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.

This project synthesizes and extends concepts from:
* Headroom (Apache 2.0) by Headroom Labs Inc.
* Claude Code Contextual Memory Virtualisation (Apache 2.0) by CosmoNaught and contributors.
* Token-Trimmer (MIT) by Darnell Dijksteel.

Detailed attribution notices are maintained in the [NOTICE](NOTICE) file.
