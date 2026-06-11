import { parseOrbit } from "@orbit/parser";
import { renderDatabaseSvg } from "@orbit/renderer-svg";
import { validateDatabase } from "@orbit/validator";
import "./style.css";

const example = `"""
Customer management database.
"""
diagram database;

enum order_status {
    pending;
    paid;
    shipped;
};

table users {
    column id int {
        pk;
        auto_increment;
    };
    column email string {
        unique;
        not_null;
    };
};

table orders {
    column id int { pk; };
    column user_id int { not_null; };
    column status order_status;
};

relationship user_orders {
    orders.user_id -> users.id;
};
`;

const source = requiredElement<HTMLTextAreaElement>("source");
const preview = requiredElement<HTMLDivElement>("preview");
const diagnostics = requiredElement<HTMLPreElement>("diagnostics");
const status = requiredElement<HTMLSpanElement>("status");

source.value = example;
source.addEventListener("input", update);
update();

function update(): void {
  const parsed = parseOrbit(source.value);
  const allDiagnostics = [...parsed.diagnostics];
  let svg: string | undefined;

  if (parsed.ast !== undefined && !hasErrors(allDiagnostics)) {
    const validated = validateDatabase(parsed.ast);
    allDiagnostics.push(...validated.diagnostics);
    if (validated.model !== undefined && !hasErrors(allDiagnostics)) {
      svg = renderDatabaseSvg(validated.model);
    }
  }

  diagnostics.textContent =
    allDiagnostics.length === 0
      ? "No diagnostics."
      : allDiagnostics
          .map(
            (diagnostic) =>
              `${diagnostic.range.start.line}:${diagnostic.range.start.column} ${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`,
          )
          .join("\n");

  if (svg === undefined) {
    preview.replaceChildren();
    status.textContent = "Invalid";
    status.className = "status error";
  } else {
    preview.innerHTML = svg;
    status.textContent =
      allDiagnostics.length === 0 ? "Valid" : "Valid with warnings";
    status.className = "status valid";
  }
}

function hasErrors(
  values: readonly { readonly severity: "error" | "warning" }[],
): boolean {
  return values.some((diagnostic) => diagnostic.severity === "error");
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null) {
    throw new Error(`Missing #${id}.`);
  }
  return element as T;
}
