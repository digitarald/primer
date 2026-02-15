export type CommandResult<T> = {
  ok: boolean;
  status: "success" | "partial" | "error";
  data: T;
  errors?: string[];
};

export interface ProgressReporter {
  update(message: string): void;
  succeed(message: string): void;
  fail(message: string): void;
  done(): void;
}

export class HumanProgressReporter implements ProgressReporter {
  update(message: string): void {
    process.stderr.write(`  ${message}\n`);
  }
  succeed(message: string): void {
    process.stderr.write(`✓ ${message}\n`);
  }
  fail(message: string): void {
    process.stderr.write(`✗ ${message}\n`);
  }
  done(): void {
    // no-op
  }
}

export class SilentProgressReporter implements ProgressReporter {
  update(): void {}
  succeed(): void {}
  fail(): void {}
  done(): void {}
}

export function createProgressReporter(json: boolean): ProgressReporter {
  return json ? new SilentProgressReporter() : new HumanProgressReporter();
}

export function outputResult<T>(result: CommandResult<T>, json: boolean): void {
  if (json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  }
}

export function outputError(message: string, json: boolean): void {
  if (json) {
    const result: CommandResult<null> = {
      ok: false,
      status: "error",
      data: null,
      errors: [message],
    };
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
}
