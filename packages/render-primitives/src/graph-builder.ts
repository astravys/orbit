import type {
  GraphLayout,
  GraphLayoutNode,
  GraphLayoutRow,
  GraphModel,
  GraphNode,
  GraphRoutedEdge,
  GraphRouting,
  GraphRow,
} from "@orbit/family-graph";
import type {
  RenderDocument,
  RenderGroup,
  RenderLine,
  RenderPath,
  RenderPathCommand,
  RenderPrimitive,
  RenderRect,
  RenderText,
} from "./contracts.js";

const documentMargin = 40;

export function buildGraphRenderDocument(
  model: GraphModel,
  layout: GraphLayout,
  routing: GraphRouting,
): RenderDocument {
  const graphNodes = new Map(model.nodes.map((node) => [node.id, node]));
  const graphEdges = new Map(model.edges.map((edge) => [edge.id, edge]));
  const enumIndexes = new Map(
    model.nodes
      .filter((node) => node.kind === "database.enum")
      .map((node, index) => [node.id, index] as const),
  );
  const primitives: RenderPrimitive[] = [];

  if (model.documentation !== undefined) {
    primitives.push({
      kind: "RenderText",
      id: "document-title",
      x: documentMargin,
      y: 30,
      text: firstLine(model.documentation),
      styleRole: "document.title",
    });
  }

  primitives.push(
    ...routing.edges.map((edge, index) =>
      buildRelationshipPath(
        edge,
        graphEdges.get(edge.id)?.label ?? edge.id,
        index,
      ),
    ),
  );

  for (const layoutNode of layout.nodes) {
    const graphNode = graphNodes.get(layoutNode.id);
    if (graphNode !== undefined) {
      primitives.push(
        buildNodeGroup(
          layoutNode,
          graphNode,
          enumIndexes.get(graphNode.id) ?? -1,
        ),
      );
    }
  }

  return {
    kind: "RenderDocument",
    width: layout.width,
    height: layout.height,
    primitives,
    title: firstLine(model.documentation ?? model.title ?? "ORBIT graph"),
    documentation: model.documentation ?? model.title ?? "ORBIT graph",
    metadata: { family: "graph" },
  };
}

function buildRelationshipPath(
  edge: GraphRoutedEdge,
  label: string,
  index: number,
): RenderPath {
  return {
    kind: "RenderPath",
    id: `relationship-${index}-${slug(label)}`,
    commands: routeCommands(edge),
    markerRole: "arrow.target",
    styleRole: "edge.relationship",
    semanticKind: "graph.edge",
    title: label,
    metadata: { edgeId: edge.id },
  };
}

function routeCommands(edge: GraphRoutedEdge): readonly RenderPathCommand[] {
  const [first, ...rest] = edge.points;
  if (first === undefined) {
    return [];
  }
  return [
    { kind: "move", x: first.x, y: first.y },
    ...rest.map((point, index): RenderPathCommand => {
      const previous = edge.points[index]!;
      return point.y === previous.y
        ? { kind: "horizontal", x: point.x }
        : { kind: "vertical", y: point.y };
    }),
  ];
}

function buildNodeGroup(
  layoutNode: GraphLayoutNode,
  graphNode: GraphNode,
  enumIndex: number,
): RenderGroup {
  const documentation = graphNode.documentation;
  const graphRows = new Map(
    (graphNode.compartments ?? []).flatMap((compartment) =>
      compartment.rows.map((row) => [row.id, row] as const),
    ),
  );
  const children: RenderPrimitive[] = [
    buildNodeBackground(layoutNode, graphNode),
    buildNodeHeader(layoutNode, graphNode),
    {
      kind: "RenderText",
      id: `${graphNode.id}:title`,
      x: layoutNode.x + 12,
      y: layoutNode.y + 24,
      text: graphNode.title,
      styleRole: "node.title",
    },
  ];

  if (documentation !== undefined) {
    children.push({
      kind: "RenderText",
      id: `${graphNode.id}:documentation`,
      x: layoutNode.x + 12,
      y: layoutNode.y + 45,
      text: firstLine(documentation),
      styleRole: "node.documentation",
    });
  }

  for (const layoutRow of layoutNode.rows) {
    const graphRow = graphRows.get(layoutRow.rowId);
    if (graphRow !== undefined) {
      children.push(...buildRowPrimitives(layoutRow, graphRow));
    }
  }

  return {
    kind: "RenderGroup",
    id: renderNodeId(graphNode, enumIndex),
    children,
    metadata: { graphNodeId: graphNode.id },
    ...(graphNode.kind === undefined ? {} : { semanticKind: graphNode.kind }),
  };
}

function buildNodeBackground(
  layoutNode: GraphLayoutNode,
  graphNode: GraphNode,
): RenderRect {
  return {
    kind: "RenderRect",
    id: `${graphNode.id}:background`,
    x: layoutNode.x,
    y: layoutNode.y,
    width: layoutNode.width,
    height: layoutNode.height,
    radius: 6,
    styleRole: "node.background",
  };
}

function buildNodeHeader(
  layoutNode: GraphLayoutNode,
  graphNode: GraphNode,
): RenderPath {
  const left = layoutNode.x;
  const top = layoutNode.y;
  const right = left + layoutNode.width;
  const bottom = top + layoutNode.headerHeight;
  return {
    kind: "RenderPath",
    id: `${graphNode.id}:header`,
    commands: [
      { kind: "move", x: left + 6, y: top },
      { kind: "horizontal", x: right - 6 },
      {
        kind: "quadratic",
        controlX: right,
        controlY: top,
        x: right,
        y: top + 6,
      },
      { kind: "vertical", y: bottom },
      { kind: "horizontal", x: left },
      { kind: "vertical", y: top + 6 },
      {
        kind: "quadratic",
        controlX: left,
        controlY: top,
        x: left + 6,
        y: top,
      },
      { kind: "close" },
    ],
    styleRole:
      graphNode.kind === "database.enum" ? "enum.header" : "node.header",
  };
}

function buildRowPrimitives(
  layoutRow: GraphLayoutRow,
  graphRow: GraphRow,
): readonly RenderPrimitive[] {
  const key = graphRow.badges?.some((badge) => badge.label === "PK")
    ? "PK"
    : graphRow.badges?.some((badge) => badge.label === "FK")
      ? "FK"
      : undefined;
  const rowStyleRole =
    key === "PK"
      ? "row.primary-key"
      : key === "FK"
        ? "row.foreign-key"
        : "row.text";
  const divider: RenderLine = {
    kind: "RenderLine",
    id: `${graphRow.id}:divider`,
    x1: layoutRow.x,
    y1: layoutRow.y,
    x2: layoutRow.x + layoutRow.width,
    y2: layoutRow.y,
    styleRole: "compartment.separator",
  };
  const rowTextPrimitive: RenderText = {
    kind: "RenderText",
    id: `${graphRow.id}:text`,
    x: layoutRow.x + (key === undefined ? 12 : 38),
    y: layoutRow.y + 19,
    text: rowText(graphRow),
    styleRole: rowStyleRole,
  };

  if (key === undefined) {
    return [divider, rowTextPrimitive];
  }

  return [
    divider,
    {
      kind: "RenderText",
      id: `${graphRow.id}:key-badge`,
      x: layoutRow.x + 12,
      y: layoutRow.y + 18,
      text: key,
      styleRole: key === "PK" ? "badge.primary-key" : "badge.foreign-key",
    },
    rowTextPrimitive,
  ];
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

function firstLine(value: string): string {
  return value.split("\n")[0] ?? value;
}

function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}
