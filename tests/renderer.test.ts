import { describe, expect, it } from "vitest";
import { parseOrbit } from "@orbit/parser";
import { renderDatabaseSvg } from "@orbit/renderer-svg";
import { validateDatabase } from "@orbit/validator";

describe("SVG renderer", () => {
  it("is deterministic, escapes text, renders arrows, and omits records", () => {
    const source = `
"""Schema & data."""
diagram database;
enum status { active; };
table users {
  column id int { pk; };
  column status status;
};
table orders { column user_id int; };
relationship link { orders.user_id -> users.id; };
records users { { id: 1 }; };
`;
    const parsed = parseOrbit(source);
    const validated = validateDatabase(parsed.ast!);
    const first = renderDatabaseSvg(validated.model!);
    const second = renderDatabaseSvg(validated.model!);
    expect(first).toBe(second);
    expect(first).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg/);
    expect(first).toContain("Schema &amp; data.");
    expect(first).toContain('class="document-title"');
    expect(first).toContain('id="table-users"');
    expect(first).toContain('id="enum-0-status"');
    expect(first).toContain('marker-end="url(#arrow)"');
    expect(first).toContain(">PK</text>");
    expect(first).toContain(">FK</text>");
    expect(first).not.toContain("records users");
    expect(first).not.toContain("{ id:");
  });
});
