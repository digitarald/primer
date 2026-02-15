import fs from "fs/promises";
import path from "path";

import { analyzeRepo } from "../services/analyzer";
import {
  generateCopilotInstructions,
  generateAreaInstructions,
  writeAreaInstruction
} from "../services/instructions";
import { ensureDir } from "../utils/fs";

type InstructionsOptions = {
  repo?: string;
  output?: string;
  model?: string;
  force?: boolean;
  areas?: boolean;
  areasOnly?: boolean;
  area?: string;
};

export async function instructionsCommand(options: InstructionsOptions): Promise<void> {
  const repoPath = path.resolve(options.repo ?? process.cwd());
  const outputPath = path.resolve(
    options.output ?? path.join(repoPath, ".github", "copilot-instructions.md")
  );

  const wantAreas = options.areas || options.areasOnly || options.area;

  // Generate root instructions unless --areas-only
  if (!options.areasOnly && !options.area) {
    let content = "";
    try {
      content = await generateCopilotInstructions({
        repoPath,
        model: options.model
      });
    } catch (error) {
      console.error("Failed to generate instructions with Copilot SDK.");
      console.error(
        "Ensure the Copilot CLI is installed (copilot --version) and logged in (run 'copilot' then '/login')."
      );
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      if (!wantAreas) return;
    }
    if (!content && !wantAreas) {
      console.error("No instructions were generated.");
      process.exitCode = 1;
      return;
    }

    if (content) {
      await ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, content, "utf8");
      console.log(`Updated ${path.relative(process.cwd(), outputPath)}`);
    }
  }

  // Generate area-based instructions
  if (wantAreas) {
    let analysis;
    try {
      analysis = await analyzeRepo(repoPath);
    } catch (error) {
      console.error(`Failed to analyze repository: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
      return;
    }
    const areas = analysis.areas ?? [];

    if (areas.length === 0) {
      console.log("No areas detected. Use primer.config.json to define custom areas.");
      return;
    }

    // Filter to specific area if --area <name> is given
    const targetAreas = options.area
      ? areas.filter((a) => a.name.toLowerCase() === options.area!.toLowerCase())
      : areas;

    if (options.area && targetAreas.length === 0) {
      console.error(
        `Area "${options.area}" not found. Available: ${areas.map((a) => a.name).join(", ")}`
      );
      process.exitCode = 1;
      return;
    }

    console.log(`Generating file-based instructions for ${targetAreas.length} area(s)...`);

    for (const area of targetAreas) {
      try {
        console.log(`  Generating for "${area.name}" (${Array.isArray(area.applyTo) ? area.applyTo.join(", ") : area.applyTo})...`);
        const body = await generateAreaInstructions({
          repoPath,
          area,
          model: options.model,
          onProgress: (msg) => process.stdout.write(`    ${msg}\r`)
        });

        if (!body.trim()) {
          console.log(`  Skipped "${area.name}" — no content generated.`);
          continue;
        }

        const result = await writeAreaInstruction(repoPath, area, body, options.force);
        if (result.status === "skipped") {
          console.log(`  Skipped "${area.name}" — file exists (use --force to overwrite).`);
          continue;
        }
        console.log(`  Wrote ${path.relative(process.cwd(), result.filePath)}`);
      } catch (error) {
        console.error(
          `  Failed for "${area.name}": ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  if (!wantAreas) {
    console.log("Please review and share feedback on any unclear or incomplete sections.");
  }
}
