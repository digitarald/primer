import path from "path";
import { analyzeRepo } from "../services/analyzer";
import { generateConfigs } from "../services/generator";
import { outputResult, outputError, type CommandResult } from "../utils/output";

type GenerateOptions = {
  force?: boolean;
  json?: boolean;
};

export async function generateCommand(type: string, repoPathArg: string | undefined, options: GenerateOptions): Promise<void> {
  const allowed = new Set(["mcp", "vscode"]);
  if (!allowed.has(type)) {
    outputError("Invalid type. Use: mcp, vscode.", Boolean(options.json));
    process.exitCode = 1;
    return;
  }

  const repoPath = path.resolve(repoPathArg ?? process.cwd());
  const analysis = await analyzeRepo(repoPath);

  const result = await generateConfigs({
    repoPath,
    analysis,
    selections: [type],
    force: Boolean(options.force)
  });

  if (options.json) {
    const cmdResult: CommandResult<{ type: string; files: typeof result.files }> = {
      ok: true,
      status: "success",
      data: { type, files: result.files },
    };
    outputResult(cmdResult, true);
    return;
  }

  if (result.files.length === 0) {
    console.log("No changes made.");
  } else {
    for (const f of result.files) {
      console.log(`${f.action === "wrote" ? "Wrote" : "Skipped"} ${f.path}`);
    }
  }
}
