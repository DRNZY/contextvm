# ContextVM (cvm)

A context manager and local proxy for AI coding agents. It cuts token consumption by skeletonizing source code, squashing repetitive logs, truncating large JSON arrays, and pruning old session history.

Original payloads are cached locally in `~/.contextvm/vault/` so full text can be restored on demand.

## What It Actually Saves

Here are the measured numbers from real files across 208,278 tokens:

| Content Type | Original | Compressed | Reduction | Latency |
| :--- | :--- | :--- | :--- | :--- |
| JSON Payloads (500 records) | 116,923 | 533 | 99.5% | 1.25ms |
| Build and Test Logs (1,000 lines) | 22,007 | 198 | 99.1% | 0.58ms |
| Old Agent Session History (25 turns) | 17,198 | 2,458 | 85.7% | 10.48ms |
| TypeScript AST Skeleton | 7,703 | 5,634 | 26.9% | 1.71ms |
| Python AST Skeleton | 4,739 | 3,322 | 29.9% | 0.79ms |
| Rust AST Skeleton | 4,434 | 3,150 | 29.0% | 1.08ms |
| Go AST Skeleton | 3,274 | 2,890 | 11.7% | 0.74ms |

### Reduction by Data Type

```text
JSON Data       [########################################] 99.5%
Build Logs      [########################################] 99.1%
Old Tool Dumps  [##################################......] 85.7%
Codebase Budget [#############################...........] 73.6%
Python AST      [############............................] 29.9%
Rust AST        [############............................] 29.0%
TypeScript AST  [###########.............................] 26.9%
Go AST          [#####...................................] 11.7%
```

## The Honest Tradeoffs

* Code reduction is 25% to 30%, not 90%. Preserving function signatures, exports, and type definitions leaves meaningful text intact so the agent still understands the contract.
* Skeletonized code omits function bodies. If an agent needs to edit a specific private helper, it must read the full file.
* JSON crushing keeps only the first 3 items in arrays by default. Full payloads can be retrieved via their SHA-256 vault hash.
* Session trimming modifies past tool outputs while keeping the most recent 2 turns untouched.

## Quick Start

```bash
git clone https://github.com/DRNZY/contextvm.git
cd contextvm
npm install
npm run build
npm link
```

## Practical CLI Usage

```bash
# Skeletonize source code (TypeScript, Python, Rust, Go)
cvm skeletonize src/index.ts

# Compress JSON or logs and cache originals in the local vault
cvm compress data.json

# Pack a repository into a strict token budget
cvm pack . --budget 16000 --output context.txt

# Trim old tool output bloat from a session file
cvm trim session.json --output clean.json

# View session lineage and snapshots
cvm tree

# Retrieve original payload from vault
cvm retrieve <sha256_hash>

# Start transparent HTTP compression proxy on port 8787
cvm proxy --port 8787
```

## Agent MCP Configuration

Add this to your MCP settings file (`claude_desktop_config.json`, `~/.gemini/config/mcp_config.json`, or `opencode.json`):

```json
{
  "mcpServers": {
    "contextvm": {
      "command": "contextvm-mcp"
    }
  }
}
```

## Upstream Licenses and Attribution

ContextVM is licensed under the Apache License, Version 2.0.

This software incorporates and synthesizes concepts and code from:
* Headroom (Apache 2.0) by Headroom Labs Inc.
* Claude Code Contextual Memory Virtualisation (Apache 2.0) by CosmoNaught and contributors.
* Token-Trimmer (MIT) by Darnell Dijksteel.

Full notices and third-party copyright statements are preserved in the NOTICE file.
