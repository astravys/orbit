#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Diagnostic } from "@orbit/core";
import { parseOrbit } from "@orbit/parser";
import { renderDatabaseSvg } from "@orbit/renderer-svg";
import { validateDatabase } from "@orbit/validator";

const usage = `Usage:
  orbit validate <file>
  orbit parse <file> --json
  orbit render <file> --output <file.svg>`;

export async function run(
  args: readonly string[],
  io = {
    stdout: (value: string) => process.stdout.write(value),
    stderr: (value: string) => process.stderr.write(value),
  },
): Promise<number> {
  const [command, input] = args;
  if (
    input === undefined ||
    (command !== "validate" && command !== "parse" && command !== "render")
  ) {
    io.stderr(`${usage}\n`);
    return 2;
  }

  const inputPath = resolve(input);
  let source: string;
  try {
    source = await readFile(inputPath, "utf8");
  } catch (error) {
    io.stderr(
      `orbit: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 2;
  }

  const parsed = parseOrbit(source, { fileName: inputPath });
  printDiagnostics(parsed.diagnostics, inputPath, io.stderr);

  if (command === "parse") {
    if (!args.includes("--json")) {
      io.stderr("orbit: parse requires --json.\n");
      return 2;
    }
    if (parsed.ast !== undefined) {
      io.stdout(`${JSON.stringify(parsed.ast, null, 2)}\n`);
    }
    return hasErrors(parsed.diagnostics) ? 1 : 0;
  }

  if (parsed.ast === undefined || hasErrors(parsed.diagnostics)) {
    return 1;
  }

  const validated = validateDatabase(parsed.ast);
  printDiagnostics(validated.diagnostics, inputPath, io.stderr);
  if (validated.model === undefined || hasErrors(validated.diagnostics)) {
    return 1;
  }

  if (command === "validate") {
    io.stdout(`${input}: valid\n`);
    return 0;
  }

  const outputFlag = args.indexOf("--output");
  const output = outputFlag === -1 ? undefined : args[outputFlag + 1];
  if (output === undefined) {
    io.stderr("orbit: render requires --output <file.svg>.\n");
    return 2;
  }
  const outputPath = resolve(output);
  try {
    await writeFile(outputPath, renderDatabaseSvg(validated.model), "utf8");
  } catch (error) {
    io.stderr(
      `orbit: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 2;
  }
  io.stdout(`${output}\n`);
  return 0;
}

function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function printDiagnostics(
  diagnostics: readonly Diagnostic[],
  fileName: string,
  write: (value: string) => void,
): void {
  for (const diagnostic of diagnostics) {
    const { line, column } = diagnostic.range.start;
    write(
      `${fileName}:${line}:${column} ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}\n`,
    );
    for (const related of diagnostic.related ?? []) {
      write(
        `${fileName}:${related.range.start.line}:${related.range.start.column} note: ${related.message}\n`,
      );
    }
  }
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
) {
  process.exitCode = await run(process.argv.slice(2));
}
