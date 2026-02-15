import React from "react";
import { render } from "ink";
import { BatchTui } from "../ui/BatchTui";
import { getGitHubToken } from "../services/github";
import { runBatchHeadless, type ProcessResult } from "../services/batch";
import { outputResult, outputError, createProgressReporter, type CommandResult } from "../utils/output";
import { getRepo } from "../services/github";

type BatchOptions = {
  output?: string;
  json?: boolean;
  quiet?: boolean;
};

async function readStdinRepos(): Promise<string[]> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks)
    .toString("utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.includes("/"));
}

function parseRepoArg(repo: string): { owner: string; name: string } | null {
  const match = repo.match(/^([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+)$/);
  if (!match) return null;
  return { owner: match[1], name: match[2] };
}

export async function batchCommand(repos: string[], options: BatchOptions): Promise<void> {
  const token = await getGitHubToken();

  if (!token) {
    outputError(
      "GitHub authentication required. Install gh CLI (brew install gh && gh auth login) or set GITHUB_TOKEN.",
      Boolean(options.json),
    );
    process.exitCode = 1;
    return;
  }

  const hasStdin = !process.stdin.isTTY;
  const hasPositional = repos.length > 0;

  // Stdin + positional args conflict
  if (hasStdin && hasPositional) {
    outputError(
      "Cannot combine stdin and positional repos. Use one or the other.",
      Boolean(options.json),
    );
    process.exitCode = 1;
    return;
  }

  // Headless path: --json or positional repos or stdin
  if (options.json || hasPositional || hasStdin) {
    let repoNames: string[];
    if (hasStdin) {
      repoNames = await readStdinRepos();
    } else {
      repoNames = repos;
    }

    if (repoNames.length === 0) {
      outputError(
        "No repos provided. Pass owner/repo arguments or pipe via stdin.",
        Boolean(options.json),
      );
      process.exitCode = 1;
      return;
    }

    // Validate repo format
    const parsed = repoNames.map((r) => ({ raw: r, parsed: parseRepoArg(r) }));
    const invalid = parsed.filter((p) => !p.parsed).map((p) => p.raw);
    if (invalid.length > 0) {
      outputError(
        `Invalid repo format: ${invalid.join(", ")}. Use owner/name.`,
        Boolean(options.json),
      );
      process.exitCode = 1;
      return;
    }

    // Resolve repo metadata from GitHub API
    const progress = createProgressReporter(Boolean(options.json) || Boolean(options.quiet));
    const ghRepos = [];
    for (const { raw, parsed: p } of parsed) {
      try {
        progress.update(`Fetching ${raw}...`);
        const repo = await getRepo(token, p!.owner, p!.name);
        ghRepos.push(repo);
      } catch {
        outputError(`Repository not found or inaccessible: ${raw}`, Boolean(options.json));
        process.exitCode = 1;
        return;
      }
    }

    const results = await runBatchHeadless(
      ghRepos,
      token,
      progress,
    );

    // Write results file if requested
    if (options.output) {
      const fs = await import("fs/promises");
      await fs.writeFile(options.output, JSON.stringify(results, null, 2), "utf8");
    }

    if (options.json) {
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.length - succeeded;
      const allOk = failed === 0;
      const result: CommandResult<{ total: number; succeeded: number; failed: number; results: ProcessResult[] }> = {
        ok: allOk,
        status: allOk ? "success" : succeeded > 0 ? "partial" : "error",
        data: { total: results.length, succeeded, failed, results },
      };
      outputResult(result, true);
    } else {
      // Human summary for positional/stdin headless mode
      const succeeded = results.filter((r) => r.success).length;
      const failed = results.length - succeeded;
      console.log(`\nBatch complete: ${succeeded} succeeded, ${failed} failed`);
      for (const r of results) {
        if (r.success) {
          console.log(`  ✓ ${r.repo}${r.prUrl ? ` → ${r.prUrl}` : ""}`);
        } else {
          console.log(`  ✗ ${r.repo} (${r.error})`);
        }
      }
    }

    if (results.some((r) => !r.success)) {
      process.exitCode = 1;
    }
    return;
  }

  // Interactive TUI path (no args, TTY)
  const { waitUntilExit } = render(
    <BatchTui token={token} outputPath={options.output} />
  );

  await waitUntilExit();
}
