// Copyright 2026 Darnell Dijksteel and Contributors
// SPDX-License-Identifier: Apache-2.0

export function generateWrapperScript(agent: string, proxyPort: number = 8787): string {
  switch (agent.toLowerCase()) {
    case 'claude':
      return `
# ContextVM Wrapper for Claude Code
export ANTHROPIC_BASE_URL="http://127.0.0.1:${proxyPort}"
echo "ContextVM active: Claude Code calls will be routed through port ${proxyPort}."
claude "$@"
`.trim();

    case 'opencode':
      return `
# ContextVM Wrapper for OpenCode
export OPENAI_BASE_URL="http://127.0.0.1:${proxyPort}/v1"
export ANTHROPIC_BASE_URL="http://127.0.0.1:${proxyPort}"
echo "ContextVM active: OpenCode calls will be routed through port ${proxyPort}."
opencode "$@"
`.trim();

    case 'cursor':
    case 'codex':
    default:
      return `
# ContextVM General Agent Wrapper
export HTTP_PROXY="http://127.0.0.1:${proxyPort}"
export HTTPS_PROXY="http://127.0.0.1:${proxyPort}"
echo "ContextVM active on port ${proxyPort}."
`.trim();
  }
}
