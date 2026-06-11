import { describe, expect, it } from "vitest";
import { parseOrbit } from "@orbit/parser";
import { validateDatabase } from "@orbit/validator";

function validate(source: string) {
  const parsed = parseOrbit(source);
  expect(parsed.ast).toBeDefined();
  return validateDatabase(parsed.ast!);
}

describe("database validator", () => {
  it("resolves directed relationships and open types", () => {
    const result = validate(`
diagram database;
table a { column id custom_type; };
table b { column a_id int; };
relationship b_to_a { b.a_id -> a.id; };
`);
    expect(result.diagnostics).toEqual([]);
    expect(result.model?.tables[0]?.columns[0]?.typeKind).toBe("opaque");
    expect(result.model?.relationships[0]?.target.table.name).toBe("a");
  });

  it("detects duplicate properties and unresolved endpoints", () => {
    const result = validate(`
diagram database;
table users {
  column id int { pk; pk; };
};
relationship broken { users.missing -> absent.id; };
`);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["ORB2010", "ORB2020", "ORB2021"]),
    );
    expect(result.model).toBeUndefined();
  });

  it("validates enum, primitive, and required record values", () => {
    const result = validate(`
diagram database;
enum state { active; };
table users {
  column id int { not_null; };
  column state state;
};
records users {
  { id: "wrong", state: missing };
  { state: active };
};
`);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["ORB2042", "ORB2041", "ORB2033"]),
    );
  });

  it("warns without rejecting a trivial property compatibility concern", () => {
    const result = validate(`
diagram database;
table users { column id int { auto_increment; }; };
`);
    expect(result.diagnostics).toMatchObject([
      { code: "ORB2011", severity: "warning" },
    ]);
    expect(result.model).toBeDefined();
  });
});
