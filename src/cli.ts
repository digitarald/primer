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

export function runCli(argv: string[]): void {
  const program = new Command();

  program
    .name("primer")
    .description("Prime repositories for AI-assisted development")
    .version("0.1.0");

  program
    .command("init")
    .argument("[path]", "Path to a local repository")
    .option("--github", "Use a GitHub repository")
    .option("--yes", "Accept defaults and skip prompts")
    .option("--force", "Overwrite existing files")
    .action(initCommand);

  program
    .command("analyze")
    .argument("[path]", "Path to a local repository")
    .option("--json", "Output JSON")
    .action(analyzeCommand);

  program
    .command("generate")
    .argument("<type>", "prompts|agents|mcp|vscode|aiignore")
    .argument("[path]", "Path to a local repository")
    .option("--force", "Overwrite existing files")
    .action(generateCommand);

  program
    .command("pr")
    .argument("[repo]", "GitHub repo in owner/name form")
    .option("--branch <name>", "Branch name", "primer/add-configs")
    .action(prCommand);

  program
    .command("eval")
    .argument("[path]", "Path to eval config JSON")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--model <name>", "Model for responses", "gpt-5")
    .option("--judge-model <name>", "Model for judging", "gpt-5")
    .option("--output <path>", "Write results JSON to file")
    .option("--init", "Create a starter primer.eval.json file")
    .action(evalCommand);

  program
    .command("tui")
    .option("--repo <path>", "Repository path", process.cwd())
    .action(tuiCommand);

  program
    .command("instructions")
    .option("--repo <path>", "Repository path", process.cwd())
    .option("--output <path>", "Output path for copilot instructions")
    .option("--model <name>", "Model for instructions generation", "gpt-5")
    .action(instructionsCommand);

  program.command("templates").action(templatesCommand);
  program.command("update").action(updateCommand);
  program.command("config").action(configCommand);

  program.parse(argv);
}
