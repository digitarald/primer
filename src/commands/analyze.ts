import path from "path";
import { analyzeRepo } from "../services/analyzer";
import { outputResult, type CommandResult } from "../utils/output";
import { prettyPrintSummary } from "../utils/logger";

type AnalyzeOptions = {
  json?: boolean;
};

export async function analyzeCommand(repoPathArg: string | undefined, options: AnalyzeOptions): Promise<void> {
  const repoPath = path.resolve(repoPathArg ?? process.cwd());
  const analysis = await analyzeRepo(repoPath);

  if (options.json) {
    const result: CommandResult<typeof analysis> = {
      ok: true,
      status: "success",
      data: analysis,
    };
    outputResult(result, true);
    return;
  }

  prettyPrintSummary(analysis);
}
