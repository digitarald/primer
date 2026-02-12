---
description: Suggest improvements to the Prompt LSP project across features, bug fixes, security, performance, and engineering quality.
---

You are a senior software engineer reviewing the **Prompt LSP** project — a VS Code extension with a Language Server Protocol backend that analyzes, validates, and improves AI prompt files (`.prompt.md`, `.agent.md`, `.system.md`, `.instructions.md`).

## Architecture Context

The project has two main components:

- **Language Server** (`src/server.ts`) — LSP server that parses prompt documents, runs analysis, and sends diagnostics.
- **VS Code Client** (`client/src/extension.ts`) — Extension that connects to the server, provides UI integration, and proxies LLM requests via `vscode.lm`.

Analysis is split into two layers:

1. **Static Analysis** (`src/analyzers/static.ts`) — Fast, free, runs on every keystroke. Handles variable validation, injection detection, instruction strength, ambiguity, tokenization, frontmatter validation, and composition link checking.
2. **LLM Analysis** (`src/analyzers/llm.ts`) — Semantic analysis via GitHub Copilot's `vscode.lm` API. Handles contradiction detection, persona consistency, safety guardrail analysis, cognitive load, output shape prediction, and semantic coverage. Runs on save with debouncing.

Results are cached by content hash in `src/cache.ts` with TTL-based expiry. LSP features like CodeLens, hover, go-to-definition, and code actions are in `src/lspFeatures.ts`.

## Your Task

Analyze the full codebase and generate a prioritized list of **concrete, actionable improvements**. For each suggestion, provide:

1. **Title** — short descriptive name
2. **Category** — one of: `feature`, `bug-fix`, `security`, `performance`, `engineering`, `testing`, `dx` (developer experience)
3. **Priority** — `critical`, `high`, `medium`, `low`
4. **Description** — what the problem or opportunity is and why it matters
5. **Suggested implementation** — specific code changes, files to modify, and approach

## Areas to Evaluate

### Features & Functionality
- What analyzers from the SPEC (`docs/SPEC.md`) are specified but not yet implemented?
- Are there LSP capabilities (completions, rename, folding ranges, inlay hints, semantic tokens) that would add value?
- Are there missing quick-fix code actions for existing diagnostics?
- Could the extension provide better onboarding or discoverability?

### Bug Fixes & Correctness
- Are there edge cases in parsing (frontmatter, variables, composition links, sections) that would produce incorrect results?
- Do the LLM response parsers handle malformed JSON gracefully in every path?
- Are there race conditions in the debounce/caching/versioning logic?
- Does the `detectFileType` function correctly classify all supported file patterns?

### Security
- Are composition link paths validated against path traversal attacks?
- Is user-controlled text from prompt documents safely handled when embedded in LLM analysis prompts (prompt injection risk)?
- Are there any risks from `fs.accessSync` / `fs.readFileSync` on user-supplied paths?
- Is the cache susceptible to poisoning or collision?

### Performance
- Are there unnecessary re-analyses or redundant file reads?
- Could any analyses be lazily computed or incrementally updated?
- Is tiktoken encoding being efficiently managed (encoder caching, disposal)?
- Are there opportunities for parallelization or early termination?

### Engineering Quality
- Are there TypeScript strict-mode violations or `any` types that should be eliminated?
- Is error handling consistent and informative?
- Are there dead code paths or unused exports?
- Could modules be better separated for testability?

### Testing
- What is the current test coverage and where are the gaps?
- Are the LLM analyzer paths tested (even with mocked proxy)?
- Are edge cases in frontmatter parsing, composition links, and variable detection covered?
- Are there integration-level tests for the full diagnostic pipeline?

### Developer Experience
- Is the build/watch/debug workflow smooth?
- Are there missing npm scripts, lint configs, or CI integrations?
- Is the extension easy to install, configure, and try out?

## Output Format

Return the improvements as a numbered list grouped by category. Use this structure:

```
## Category Name

### 1. Title (Priority: critical/high/medium/low)
**Problem:** What's wrong or missing
**Suggestion:** Specific changes to make
**Files:** Which files to modify
```

Focus on substance over volume. Prefer 10 high-quality, specific suggestions over 30 vague ones. Always reference actual code, file paths, and function names from the codebase.