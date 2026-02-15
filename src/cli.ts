import { Command } from "commander";
import { initCommand } from "./commands/init";
import { analyzeCommand } from "./commands/analyze";
import { generateCommand } from "./commands/generate";
import { prCommand } from "./commands/pr";
import { templatesCommand } from "./commands/templates";
import { updateCommand } from "./commands/update";
import { configCommand } from "./commands/config";
import { evalCommand } from "./commands/eval";
import { tuiCommand } from "./commands/tui";
import { instructionsCommand } from "./commands/instructions";
import { batchCommand } from "./commands/batch";

// Wraps action handlers to merge global options (like --json) into the local options object.
// Commander passes (arg1, arg2, ..., localOpts, Command) to action handlers.
function withGlobalOpts(fn: (...args: any[]) => Promise<void>) {
  return (...args: any[]) => {
    const cmd = args.pop() as Command;
    const localOpts = args.pop();
    const globalOpts = cmd.optsWithGlobals();
    const merged = { ...localOpts, json: globalOpts.json, quiet: globalOpts.quiet };
    args.push(merged);
    return fn(...args);
  };
}

export function runCli(argv: string[]): void {
  const program = new Command();

  program
    .name("primer")
    .description("Prime repositories for AI-assisted development")
    .version("0.1.0")
    .option("--json", "Output machine-readable JSON to stdout")
    .option("--quiet", "Suppress stderr progress output");

  program
    .command("init")
    .argument("[path]", "Path to a local repository")
    .option("--github", "Use a GitHub repository")
    .option("--yes", "Accept defaults and skip prompts")
    .option("--force", "Overwrite existing files")
    .action(withGlobalOpts(initCommand));

  program
    .command("analyze")
    .argument("[path]", "Path to a local repository")
    .action(withGlobalOpts(analyzeCommand));

  program
    .command("generate")
    .argument("<type>", "mcp|vscode")
    .argument("[path]", "Path to a local repository")
    .option("--force", "Overwrite existing files")
    .action(withGlobalOpts(generateCommand));

  program
    .command("pr")
    .argument("[repo]", "GitHub repo in owner/name form")
    .option("--branch <name>", "Branch name", "primer/add-configs")
    .action(withGlobalOpts(prCommand));

  program
    .command("eval")
    .argument("[path]", "Path to eval config JSON")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--model <name>", "Model for responses", "gpt-5")
    .option("--judge-model <name>", "Model for judging", "gpt-5")
    .option("--output <path>", "Write results JSON to file")
    .option("--init", "Create a starter primer.eval.json file")
    .action(withGlobalOpts(evalCommand));

  program
    .command("tui")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--no-animation", "Skip the animated banner intro")
    .action(tuiCommand);

  program
    .command("instructions")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--output <path>", "Output path for copilot instructions")
    .option("--model <name>", "Model for instructions generation", "gpt-4.1")
    .action(withGlobalOpts(instructionsCommand));

  program
    .command("batch")
    .description("Batch process multiple repos across orgs")
    .argument("[repos...]", "Repos in owner/name form (headless mode)")
    .option("--output <path>", "Write results JSON to file")
    .action(withGlobalOpts(batchCommand));

  program.command("templates").action(templatesCommand);
  program.command("update").action(updateCommand);
  program.command("config").action(configCommand);

  program.parse(argv);
}
