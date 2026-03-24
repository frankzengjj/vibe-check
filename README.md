# vibe-check

> Quiz yourself on your git diff before pushing — fight comprehension debt from AI-assisted coding.

Engineers increasingly rely on AI to generate code without fully reading or understanding it. Over time, this creates *comprehension debt* — a codebase no one actually understands. `vibe-check` intercepts `git push` and quizzes you on the code you're about to ship. The push only proceeds once you demonstrate you understand what you're pushing.

---

## How it works

1. You run `git push`
2. `vibe-check` intercepts via a `pre-push` git hook and analyzes your diff
3. Your AI model generates 2–3 targeted questions scoped to the changed lines
4. You answer in the terminal
5. Your AI evaluates answers semantically — correct answers let the push through, wrong answers give feedback with a chance to retry

```
$ git push origin main

🔍 vibe-check: Analyzing your diff...

  (type 'q' or 'exit' at any prompt to abort the push)

Q1: In auth.ts line 42, why is the token hashed before storage rather than stored as plaintext?
> to prevent exposing raw tokens if the database is compromised
  ✅ Correct. Hashing ensures tokens at rest are useless to attackers even with DB access.

Q2: What happens if `user_id` is None in the updated get_user() function?
> it returns null
  ❌ The function raises a ValueError. Returning null silently would mask the error upstream.

Q3: Why was the session expiry moved from 7 days to 24 hours?
> security requirement to limit session lifetime
  ✅ Correct.

Score: 2/3 — passed threshold (2 needed).
✅ vibe-check passed (2/3).
🚀 Push approved.
```

---

## Installation

**Requirements:** Node.js 20+

```bash
npm install -g vibe-check
```

Or use without installing:

```bash
npx vibe-check init
```

---

## Setup

### 1. Install the hook in your project

```bash
cd your-project
vbc init
```

This installs a `pre-push` hook in `.git/hooks/` and prompts you to configure your AI endpoint.

### 2. Configure your AI model

`vibe-check` works with **any OpenAI-compatible API endpoint** — it ships with no AI provider. You bring your own model.

**Via interactive prompt** (during `vbc init`):
```
Base URL: https://api.openai.com/v1
Model:    gpt-4o
API key:  sk-...
```

**Via environment variables:**
```bash
export VIBE_CHECK_API_KEY=your-api-key
export VIBE_CHECK_BASE_URL=https://api.openai.com/v1
export VIBE_CHECK_MODEL=gpt-4o
```

Add these to your `~/.zshrc` or `~/.bashrc` to persist across sessions.

---

## Supported AI providers

Any provider exposing an OpenAI-compatible `/v1/chat/completions` endpoint works:

| Provider | Base URL | Notes |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-4o`, `gpt-4-turbo`, etc. |
| Anthropic | `https://api.anthropic.com/v1` | `claude-sonnet-4-6`, `claude-opus-4-6`, etc. |
| Ollama (local) | `http://localhost:11434/v1` | `llama3`, `mistral`, etc. — no API key needed |
| LM Studio (local) | `http://localhost:1234/v1` | Any locally loaded model |
| Groq | `https://api.groq.com/openai/v1` | `llama-3.1-70b-versatile`, etc. |
| Together AI | `https://api.together.xyz/v1` | Various open models |
| Azure OpenAI | `https://{resource}.openai.azure.com/openai/deployments/{deployment}` | Use deployment name as model |

---

## CLI reference

```
vbc init          Install the pre-push hook + configure AI endpoint
vbc config        Show current configuration
vbc uninstall     Remove the pre-push hook
vbc run           Analyze diff and quiz (called automatically by the hook)
```

### Options for `vbc run`

```
--skip            Bypass the quiz (push proceeds, bypass is logged locally)
--remote <name>   Remote name (passed automatically by git)
--url <url>       Remote URL (passed automatically by git)
```

---

## Configuration

`vibe-check` resolves configuration in this order (later entries win):

1. Built-in defaults
2. User config: `~/.vibe-check/config.json`
3. Project config: `.vibecheck.json` in the repo root
4. Environment variables
5. CLI flags

### Config file format

Create `.vibecheck.json` in your repo root (or `~/.vibe-check/config.json` for global defaults):

```json
{
  "ai": {
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "model": "gpt-4o"
  },
  "questionCount": 3,
  "passThreshold": 2,
  "maxRetries": 1,
  "skipInCI": true,
  "diffMaxLines": 2000,
  "excludeFiles": [
    "src/generated/**",
    "*.snapshot.ts"
  ]
}
```

### Config options

| Option | Default | Description |
|---|---|---|
| `ai.baseUrl` | `https://api.openai.com/v1` | OpenAI-compatible API base URL |
| `ai.apiKey` | — | API key for your provider |
| `ai.model` | `gpt-4o` | Model identifier |
| `questionCount` | `3` | Number of questions generated per push |
| `passThreshold` | `2` | Number of questions that must pass |
| `maxRetries` | `1` | Retry attempts for failed questions |
| `skipInCI` | `true` | Auto-skip in CI environments |
| `diffMaxLines` | `2000` | Max diff lines before smart sampling kicks in |
| `excludeFiles` | `[]` | Glob patterns for files to skip (adds to built-in exclusions) |

### Environment variables

| Variable | Description |
|---|---|
| `VIBE_CHECK_API_KEY` | API key |
| `VIBE_CHECK_BASE_URL` | API base URL |
| `VIBE_CHECK_MODEL` | Model identifier |
| `VIBE_CHECK_SKIP` | Set to `1` to bypass the quiz (logged) |

---

## Bypassing

If you need to push urgently without being quizzed:

```bash
VIBE_CHECK_SKIP=1 git push
```

The bypass is logged locally to `~/.vibe-check/bypass.log` with a timestamp, repo, and branch — so there's accountability without being a hard blocker.

To remove the hook entirely:

```bash
vbc uninstall
```

---

## Large diffs

`vibe-check` handles large diffs gracefully without sending huge payloads to your AI provider:

| Diff size | Strategy |
|---|---|
| < 500 lines | Full diff sent |
| 500–2000 lines | Strips context, keeps only changed lines + 3 lines of surrounding code |
| > 2000 lines | Samples top 5 most significant files (prioritizes source over tests/config) |

Files automatically excluded from analysis: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `*.min.js`, `*.min.css`, `*.map`, binary files.

---

## CI environments

`vibe-check` automatically detects CI environments and skips the quiz (a terminal isn't available anyway). Detection covers: `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `JENKINS_URL`, `BUILDKITE`, and `CONTINUOUS_INTEGRATION`.

To disable CI auto-skip: set `"skipInCI": false` in your config.

---

## How questions are evaluated

Questions are judged semantically, not by exact match. The evaluator is instructed to:

- Accept answers that demonstrate understanding even if the phrasing differs
- Focus on whether you understand the *why* and *what*, not the exact wording
- Be generous with alternative terminology
- Only fail answers that show a clear misunderstanding or are completely off-topic

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Setup:**
```bash
git clone https://github.com/frankzengjj/vibe-check
cd vibe-check
nvm use   # requires Node 20+
npm install
npm run build
npm test
```

**Project structure:**
```
src/
  ai/           AI client (fetch-based, no SDKs) + prompt templates
  cli/          Commands (init, run, config, uninstall) + TTY prompt handler
  config/       Schema (Zod), loader, defaults
  diff/         Unified diff parser, file filter, smart sampler
  git/          Hook install/uninstall, diff extraction, stdin parser
  log/          Bypass logging
bin/
  vibe-check.ts CLI entry point (commander)
hooks/
  pre-push.sh   Hook template installed into .git/hooks/
test/
  unit/         Unit tests for diff, filter, sampler, stdin parsing
```

---

## License

Apache 2.0
