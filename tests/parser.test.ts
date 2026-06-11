import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lex, parseOrbit } from "@orbit/parser";

const root = resolve(import.meta.dirname, "..");

describe("lexer", () => {
  it("tracks tokens and discards comments", () => {
    const result = lex(
      "diagram database; // ignored\nrecords users { { id: -1, ok: true }; };",
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.tokens.map((token) => token.kind)).not.toContain("comment");
    expect(result.tokens.find((token) => token.kind === "number")?.value).toBe(
      -1,
    );
    expect(result.tokens.at(-1)?.range.start.line).toBe(2);
  });
});

describe("parser", () => {
  it("parses every Wave 1 declaration", () => {
    const source = readFileSync(
      resolve(root, "docs/examples/customer-database.orbit"),
      "utf8",
    );
    const result = parseOrbit(source);
    expect(result.diagnostics).toEqual([]);
    expect(
      result.ast?.declarations.map((declaration) => declaration.kind),
    ).toEqual([
      "EnumDeclaration",
      "TableDeclaration",
      "TableDeclaration",
      "RelationshipDeclaration",
      "RecordsDeclaration",
    ]);
    expect(result.ast?.diagram.documentation).toBe(
      "Customer management database.",
    );
  });

  it("requires semicolons after blocks", () => {
    const source = readFileSync(
      resolve(root, "tests/fixtures/invalid/missing-block-semicolon.orbit"),
      "utf8",
    );
    expect(
      parseOrbit(source).diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("ORB1191");
  });

  it("rejects obsolete ref syntax explicitly", () => {
    const source = readFileSync(
      resolve(root, "tests/fixtures/invalid/obsolete-ref.orbit"),
      "utf8",
    );
    expect(
      parseOrbit(source).diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("ORB1106");
  });

  it("does not attach documentation across blank lines or comments", () => {
    const blankLine = readFileSync(
      resolve(root, "tests/fixtures/invalid/orphan-documentation.orbit"),
      "utf8",
    );
    const comment =
      'diagram database;\n"""\nUsers.\n"""\n// no attachment\ntable users { column id int; };';
    expect(
      parseOrbit(blankLine).diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("ORB1190");
    expect(
      parseOrbit(comment).diagnostics.map((diagnostic) => diagnostic.code),
    ).toContain("ORB1190");
  });
});
