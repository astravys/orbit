import type { ValidatedDatabaseModel } from "@orbit/core";
import { layoutGraph, routeGraphEdges } from "@orbit/family-graph";
import {
  buildGraphRenderDocument,
  type RenderDocument,
  type RenderGroup,
  type RenderLine,
  type RenderPath,
  type RenderPathCommand,
  type RenderPrimitive,
  type RenderRect,
  type RenderText,
} from "@orbit/render-primitives";
import { databaseToGraphModel } from "@orbit/validator";

export function renderDatabaseSvg(model: ValidatedDatabaseModel): string {
  const graph = databaseToGraphModel(model);
  const layout = layoutGraph(graph, {
    secondaryNodeKinds: ["database.enum"],
  });
  const routing = routeGraphEdges(graph, layout, {
    endpointPolicy: "nearest-node-boundary",
    targetClearance: 8,
  });
  const document = buildGraphRenderDocument(graph, layout, routing);
  return renderDocumentToSvg(
    model.documentation === undefined
      ? {
          ...document,
          title: "ORBIT database schema",
          documentation: "ORBIT database schema",
        }
      : document,
  );
}

export function renderDocumentToSvg(document: RenderDocument): string {
  const width = coordinate(document.width);
  const height = coordinate(document.height);
  const title = document.title ?? "ORBIT diagram";
  const documentation = document.documentation ?? title;

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="orbit-title orbit-description">`,
    `<title id="orbit-title">${escapeXml(title)}</title>`,
    `<desc id="orbit-description">${escapeXml(documentation)}</desc>`,
    `<defs>`,
    `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/></marker>`,
    `</defs>`,
    `<style>`,
    `.box{fill:#fff;stroke:#334155;stroke-width:1.5}.header{fill:#e2e8f0}.enum-header{fill:#ede9fe}.divider{stroke:#cbd5e1}.document-title{font:600 18px system-ui,sans-serif;fill:#0f172a}.title{font:600 15px system-ui,sans-serif;fill:#0f172a}.row{font:13px ui-monospace,monospace;fill:#1e293b}.row-pk{font-weight:700;fill:#7c2d12}.row-fk{font-weight:700;fill:#1d4ed8}.key-badge{font:700 10px system-ui,sans-serif}.documentation{font:12px system-ui,sans-serif;fill:#64748b}.relationship{fill:none;stroke:#334155;stroke-width:1.75}`,
    `</style>`,
    document.primitives.map(serializePrimitive).join("\n"),
    `</svg>`,
    "",
  ].join("\n");
}

function serializePrimitive(primitive: RenderPrimitive): string {
  switch (primitive.kind) {
    case "RenderGroup":
      return serializeGroup(primitive);
    case "RenderRect":
      return serializeRect(primitive);
    case "RenderText":
      return serializeText(primitive);
    case "RenderPath":
      return serializePath(primitive);
    case "RenderLine":
      return serializeLine(primitive);
    default:
      throw new Error(
        `Unsupported render primitive '${String((primitive as { kind?: unknown }).kind)}'.`,
      );
  }
}

function serializeGroup(group: RenderGroup): string {
  return [
    `<g id="${escapeXml(group.id)}">`,
    ...serializeGroupChildren(group.children),
    `</g>`,
  ].join("\n");
}

function serializeGroupChildren(
  children: readonly RenderPrimitive[],
): readonly string[] {
  const serialized: string[] = [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]!;
    if (child.kind !== "RenderLine") {
      serialized.push(serializePrimitive(child));
      if (
        child.styleRole === "node.title" &&
        children[index + 1]?.kind === "RenderLine"
      ) {
        serialized.push("");
      }
      continue;
    }

    let row = serializeLine(child);
    while (
      index + 1 < children.length &&
      children[index + 1]?.kind === "RenderText"
    ) {
      row += serializeText(children[index + 1] as RenderText);
      index += 1;
    }
    serialized.push(row);
  }
  return serialized;
}

function serializeRect(rect: RenderRect): string {
  const radius =
    rect.radius === undefined ? "" : ` rx="${coordinate(rect.radius)}"`;
  return `<rect${classAttribute(rect.styleRole)} x="${coordinate(rect.x)}" y="${coordinate(rect.y)}" width="${coordinate(rect.width)}" height="${coordinate(rect.height)}"${radius} />`;
}

function serializeText(text: RenderText): string {
  const anchor =
    text.anchor === undefined ? "" : ` text-anchor="${text.anchor}"`;
  const baseline =
    text.baseline === undefined ? "" : ` dominant-baseline="${text.baseline}"`;
  return `<text${classAttribute(text.styleRole)} x="${coordinate(text.x)}" y="${coordinate(text.y)}"${anchor}${baseline}>${escapeXml(text.text)}</text>`;
}

function serializePath(path: RenderPath): string {
  const id =
    path.semanticKind === "graph.edge" ? ` id="${escapeXml(path.id)}"` : "";
  const marker =
    path.markerRole === "arrow.target" ? ` marker-end="url(#arrow)"` : "";
  const element = `<path${id}${classAttribute(path.styleRole)} d="${path.commands.map(serializePathCommand).join(" ")}"${marker} />`;
  return path.title === undefined
    ? element
    : `${element}<title>${escapeXml(path.title)}</title>`;
}

function serializePathCommand(command: RenderPathCommand): string {
  switch (command.kind) {
    case "move":
      return `M ${coordinate(command.x)} ${coordinate(command.y)}`;
    case "line":
      return `L ${coordinate(command.x)} ${coordinate(command.y)}`;
    case "horizontal":
      return `H ${coordinate(command.x)}`;
    case "vertical":
      return `V ${coordinate(command.y)}`;
    case "quadratic":
      return `Q ${coordinate(command.controlX)} ${coordinate(command.controlY)} ${coordinate(command.x)} ${coordinate(command.y)}`;
    case "close":
      return "Z";
    default:
      throw new Error(
        `Unsupported render path command '${String((command as { kind?: unknown }).kind)}'.`,
      );
  }
}

function serializeLine(line: RenderLine): string {
  return `<line${classAttribute(line.styleRole)} x1="${coordinate(line.x1)}" y1="${coordinate(line.y1)}" x2="${coordinate(line.x2)}" y2="${coordinate(line.y2)}" />`;
}

function classAttribute(styleRole: string | undefined): string {
  if (styleRole === undefined) {
    return "";
  }
  const className = styleClasses[styleRole];
  if (className === undefined) {
    throw new Error(`Unsupported SVG style role '${styleRole}'.`);
  }
  return ` class="${className}"`;
}

const styleClasses: Readonly<Record<string, string>> = {
  "document.title": "document-title",
  "node.background": "box",
  "node.header": "header",
  "enum.header": "enum-header",
  "node.title": "title",
  "node.documentation": "documentation",
  "compartment.separator": "divider",
  "row.text": "row",
  "row.primary-key": "row row-pk",
  "row.foreign-key": "row row-fk",
  "badge.primary-key": "key-badge row row-pk",
  "badge.foreign-key": "key-badge row row-fk",
  "edge.relationship": "relationship",
};

function coordinate(value: number): string {
  if (!Number.isFinite(value)) {
    throw new RangeError(
      `SVG coordinates must be finite; received ${String(value)}.`,
    );
  }
  return String(value);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
