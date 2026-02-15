import path from "path";
import fs from "fs/promises";
import { runEval } from "../services/evaluator";
import { outputResult, outputError, type CommandResult } from "../utils/output";

type EvalOptions = {
  repo?: string;
  model?: string;
  judgeModel?: string;
  output?: string;
  init?: boolean;
  json?: boolean;
};

const EVAL_SCAFFOLD = {
  instructionFile: ".github/copilot-instructions.md",
  cases: [
    {
      id: "project-overview",
      prompt: "Summarize what this project does and list the main entry points.",
      expectation: "Should mention the primary purpose and key files/directories."
    },
    {
      id: "tech-stack",
      prompt: "What languages and frameworks does this project use?",
      expectation: "Should correctly identify the main languages and frameworks."
    },
    {
      id: "build-commands",
      prompt: "How do I build and test this project?",
      expectation: "Should provide the correct build and test commands from package.json or equivalent."
    }
  ]
};

export async function evalCommand(configPathArg: string | undefined, options: EvalOptions): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  
  // Handle --init flag
  if (options.init) {
    const outputPath = path.join(repoPath, "primer.eval.json");
    try {
      await fs.access(outputPath);
      outputError(`primer.eval.json already exists at ${outputPath}`, Boolean(options.json));
      process.exitCode = 1;
      return;
    } catch {
      // File doesn't exist, create it
    }
    await fs.writeFile(outputPath, JSON.stringify(EVAL_SCAFFOLD, null, 2), "utf8");
    if (options.json) {
      const result: CommandResult<{ outputPath: string }> = {
        ok: true,
        status: "success",
        data: { outputPath },
      };
      outputResult(result, true);
    } else {
      console.log(`Created ${outputPath}`);
      console.log("Edit the file to add your own test cases, then run 'primer eval' to test.");
    }
    return;
  }

  const configPath = path.resolve(configPathArg ?? path.join(repoPath, "primer.eval.json"));

  const { summary, results } = await runEval({
    configPath,
    repoPath,
    model: options.model ?? "gpt-5",
    judgeModel: options.judgeModel ?? "gpt-5",
    outputPath: options.output
  });

  if (options.json) {
    const cmdResult: CommandResult<typeof results> = {
      ok: true,
      status: "success",
      data: results,
    };
    outputResult(cmdResult, true);
  } else {
    console.log(summary);
  }
}
