import fs from "fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function assertCopilotCliReady(): Promise<string> {
  const cliPath = await findCopilotCliPath();

  try {
    await execFileAsync(cliPath, ["--version"], { timeout: 5000 });
  } catch {
    throw new Error(`Copilot CLI at ${cliPath} is not working.`);
  }

  return cliPath;
}

async function findCopilotCliPath(): Promise<string> {
  try {
    const { stdout } = await execFileAsync("which", ["copilot"], { timeout: 5000 });
    return stdout.trim();
  } catch {
    // Ignore - will try VS Code location
  }

  const home = process.env.HOME ?? "";
  const vscodeLocations = [
    `${home}/Library/Application Support/Code - Insiders/User/globalStorage/github.copilot-chat/copilotCli/copilot`,
    `${home}/Library/Application Support/Code/User/globalStorage/github.copilot-chat/copilotCli/copilot`,
    `${home}/.vscode-insiders/extensions/github.copilot-chat-*/copilotCli/copilot`,
    `${home}/.vscode/extensions/github.copilot-chat-*/copilotCli/copilot`
  ];

  for (const location of vscodeLocations) {
    try {
      await fs.access(location);
      return location;
    } catch {
      // Try next location
    }
  }

  throw new Error("Copilot CLI not found. Install GitHub Copilot Chat extension in VS Code.");
}
