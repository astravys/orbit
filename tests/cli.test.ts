import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../apps/cli/src/index.js";

function output() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: (value: string) => {
        stdout += value;
      },
      stderr: (value: string) => {
        stderr += value;
      },
    },
    read: () => ({ stdout, stderr }),
  };
}

describe("CLI", () => {
  it("validates and emits JSON AST", async () => {
    const directory = await mkdtemp(join(tmpdir(), "orbit-cli-"));
    const input = join(directory, "schema.orbit");
    await writeFile(
      input,
      "diagram database;\ntable users { column id int; };\n",
    );
    const validateOutput = output();
    expect(await run(["validate", input], validateOutput.io)).toBe(0);
    expect(validateOutput.read().stdout).toContain("valid");

    const parseOutput = output();
    expect(await run(["parse", input, "--json"], parseOutput.io)).toBe(0);
    expect(JSON.parse(parseOutput.read().stdout).kind).toBe("OrbitDocument");
  });

  it("does not create or overwrite output for invalid models", async () => {
    const directory = await mkdtemp(join(tmpdir(), "orbit-cli-"));
    const input = join(directory, "invalid.orbit");
    const target = join(directory, "schema.svg");
    await writeFile(
      input,
      "diagram database;\ntable users { column id int; }\n",
    );
    await writeFile(target, "keep");
    const captured = output();
    expect(await run(["render", input, "--output", target], captured.io)).toBe(
      1,
    );
    expect(await readFile(target, "utf8")).toBe("keep");
    expect(captured.read().stderr).toContain("ORB1191");
  });
});
