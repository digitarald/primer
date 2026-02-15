import path from "path";
import fs from "fs/promises";
import { generateCopilotInstructions } from "../services/instructions";
import { ensureDir } from "../utils/fs";
import { outputResult, outputError, createProgressReporter, type CommandResult } from "../utils/output";

type InstructionsOptions = {
  repo?: string;
  output?: string;
  model?: string;
  json?: boolean;
  quiet?: boolean;
};

export async function instructionsCommand(options: InstructionsOptions): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  const outputPath = path.resolve(
    options.output ?? path.join(repoPath, ".github", "copilot-instructions.md")
  );

  let content = "";
  const progress = createProgressReporter(Boolean(options.json) || Boolean(options.quiet));
  try {
    progress.update("Generating instructions...");
    content = await generateCopilotInstructions({
      repoPath,
      model: options.model,
      onProgress: (msg) => progress.update(msg),
    });
  } catch (error) {
    const msg = "Failed to generate instructions. Ensure Copilot CLI is installed and authenticated.";
    outputError(msg, Boolean(options.json));
    if (!options.json) {
      console.error(error instanceof Error ? error.message : String(error));
    }
    process.exitCode = 1;
    return;
  }
  if (!content) {
    outputError("No instructions were generated.", Boolean(options.json));
    process.exitCode = 1;
    return;
  }

  await ensureDir(path.dirname(outputPath));
  await fs.writeFile(outputPath, content, "utf8");

  if (options.json) {
    const stat = await fs.stat(outputPath);
    const result: CommandResult<{ outputPath: string; model: string; byteCount: number }> = {
      ok: true,
      status: "success",
      data: {
        outputPath: path.relative(process.cwd(), outputPath),
        model: options.model ?? "gpt-4.1",
        byteCount: stat.size,
      },
    };
    outputResult(result, true);
  } else {
    console.log(`Updated ${path.relative(process.cwd(), outputPath)}`);
    console.log("Please review and share feedback on any unclear or incomplete sections.");
  }
}