import type { ValidatedDatabaseModel } from "@orbit/core";
import {
  layoutGraph,
  type GraphLayoutNode,
  type GraphLayoutRow,
  type GraphModel,
  type GraphNode,
  type GraphRow,
} from "@orbit/family-graph";
import { databaseToGraphModel } from "@orbit/validator";

const margin = 40;

export function renderDatabaseSvg(model: ValidatedDatabaseModel): string {
  const graph = databaseToGraphModel(model);
  const layout = layoutGraph(graph, {
    secondaryNodeKinds: ["database.enum"],
  });
  const graphNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const enumIndexes = new Map(
    graph.nodes
      .filter((node) => node.kind === "database.enum")
      .map((node, index) => [node.id, index] as const),
  );
  const layoutNodes = new Map(layout.nodes.map((node) => [node.id, node]));
  const rows = new Map(
    layout.nodes.flatMap((node) =>
      node.rows.map((row) => [`${node.id}:${row.rowId}`, row] as const),
    ),
  );
  const relationships = renderRelationships(graph, layoutNodes, rows);
  const title = model.documentation ?? "ORBIT database schema";

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="orbit-title orbit-description">`,
    `<title id="orbit-title">${escapeXml(title.split("\n")[0] ?? title)}</title>`,
    `<desc id="orbit-description">${escapeXml(title)}</desc>`,
    `<defs>`,
    `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/></marker>`,
    `</defs>`,
    `<style>`,
    `.box{fill:#fff;stroke:#334155;stroke-width:1.5}.header{fill:#e2e8f0}.enum-header{fill:#ede9fe}.divider{stroke:#cbd5e1}.document-title{font:600 18px system-ui,sans-serif;fill:#0f172a}.title{font:600 15px system-ui,sans-serif;fill:#0f172a}.row{font:13px ui-monospace,monospace;fill:#1e293b}.row-pk{font-weight:700;fill:#7c2d12}.row-fk{font-weight:700;fill:#1d4ed8}.key-badge{font:700 10px system-ui,sans-serif}.documentation{font:12px system-ui,sans-serif;fill:#64748b}.relationship{fill:none;stroke:#334155;stroke-width:1.75}`,
    `</style>`,
    model.documentation === undefined
      ? ""
      : `<text class="document-title" x="${margin}" y="30">${escapeXml(model.documentation.split("\n")[0] ?? model.documentation)}</text>`,
    relationships,
    layout.nodes
      .map((node) => {
        const graphNode = graphNodes.get(node.id);
        return graphNode === undefined
          ? ""
          : renderNode(node, graphNode, enumIndexes.get(graphNode.id) ?? -1);
      })
      .join("\n"),
    `</svg>`,
    "",
  ].join("\n");
}

function renderRelationships(
  graph: GraphModel,
  nodes: ReadonlyMap<string, GraphLayoutNode>,
  rows: ReadonlyMap<string, GraphLayoutRow>,
): string {
  return graph.edges
    .map((edge, index) => {
      const source = nodes.get(edge.source.nodeId);
      const target = nodes.get(edge.target.nodeId);
      const sourceRow =
        edge.source.rowId === undefined
          ? undefined
          : rows.get(`${edge.source.nodeId}:${edge.source.rowId}`);
      const targetRow =
        edge.target.rowId === undefined
          ? undefined
          : rows.get(`${edge.target.nodeId}:${edge.target.rowId}`);
      if (
        source === undefined ||
        target === undefined ||
        sourceRow === undefined ||
        targetRow === undefined
      ) {
        return "";
      }
      const sourceIsLeft = source.x < target.x;
      const startX = sourceIsLeft ? source.x + source.width : source.x;
      const startY = sourceRow.y + sourceRow.height / 2;
      const endX = sourceIsLeft ? target.x - 8 : target.x + target.width + 8;
      const endY = targetRow.y + targetRow.height / 2;
      const middleX = (startX + endX) / 2;
      return [
        `<path id="relationship-${index}-${slug(edge.label ?? edge.id)}" class="relationship" d="M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}" marker-end="url(#arrow)" />`,
        `<title>${escapeXml(edge.label ?? edge.id)}</title>`,
      ].join("");
    })
    .join("\n");
}

function renderNode(
  layoutNode: GraphLayoutNode,
  graphNode: GraphNode,
  enumIndex: number,
): string {
  const headerClass =
    graphNode.kind === "database.enum" ? "enum-header" : "header";
  const documentation = graphNode.documentation?.split("\n")[0];
  const graphRows = new Map(
    (graphNode.compartments ?? []).flatMap((compartment) =>
      compartment.rows.map((row) => [row.id, row] as const),
    ),
  );
  const rows = layoutNode.rows
    .map((row) => {
      const graphRow = graphRows.get(row.rowId);
      return graphRow === undefined ? "" : renderRow(row, graphRow);
    })
    .join("\n");
  return [
    `<g id="${renderNodeId(graphNode, enumIndex)}">`,
    `<rect class="box" x="${layoutNode.x}" y="${layoutNode.y}" width="${layoutNode.width}" height="${layoutNode.height}" rx="6" />`,
    `<path class="${headerClass}" d="M ${layoutNode.x + 6} ${layoutNode.y} H ${layoutNode.x + layoutNode.width - 6} Q ${layoutNode.x + layoutNode.width} ${layoutNode.y} ${layoutNode.x + layoutNode.width} ${layoutNode.y + 6} V ${layoutNode.y + layoutNode.headerHeight} H ${layoutNode.x} V ${layoutNode.y + 6} Q ${layoutNode.x} ${layoutNode.y} ${layoutNode.x + 6} ${layoutNode.y} Z" />`,
    `<text class="title" x="${layoutNode.x + 12}" y="${layoutNode.y + 24}">${escapeXml(graphNode.title)}</text>`,
    documentation === undefined
      ? ""
      : `<text class="documentation" x="${layoutNode.x + 12}" y="${layoutNode.y + 45}">${escapeXml(documentation)}</text>`,
    rows,
    `</g>`,
  ].join("\n");
}

function renderRow(layoutRow: GraphLayoutRow, graphRow: GraphRow): string {
  const key = graphRow.badges?.some((badge) => badge.label === "PK")
    ? "PK"
    : graphRow.badges?.some((badge) => badge.label === "FK")
      ? "FK"
      : undefined;
  const rowClass =
    key === "PK" ? "row row-pk" : key === "FK" ? "row row-fk" : "row";
  const text = rowText(graphRow);
  return [
    `<line class="divider" x1="${layoutRow.x}" y1="${layoutRow.y}" x2="${layoutRow.x + layoutRow.width}" y2="${layoutRow.y}" />`,
    key === undefined
      ? ""
      : `<text class="key-badge ${rowClass}" x="${layoutRow.x + 12}" y="${layoutRow.y + 18}">${key}</text>`,
    `<text class="${rowClass}" x="${layoutRow.x + (key === undefined ? 12 : 38)}" y="${layoutRow.y + 19}">${escapeXml(text)}</text>`,
  ].join("");
}

function rowText(row: GraphRow): string {
  const properties = row.metadata?.["properties"];
  return Array.isArray(properties) && properties.length > 0
    ? `${row.label} [${properties.join(", ")}]`
    : row.label;
}

function renderNodeId(node: GraphNode, enumIndex: number): string {
  return node.kind === "database.enum"
    ? `enum-${enumIndex}-${slug(node.title)}`
    : `table-${slug(node.title)}`;
}

function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
