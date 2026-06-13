import type { GraphModel, GraphNode, GraphPortSide } from "./index.js";

export interface GraphLayoutBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface GraphLayoutRow {
  readonly nodeId: string;
  readonly compartmentId: string;
  readonly rowId: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly portId?: string;
}

export interface GraphLayoutPort {
  readonly id: string;
  readonly nodeId: string;
  readonly rowId?: string;
  readonly x: number;
  readonly y: number;
  readonly preferredSide?: GraphPortSide;
}

export interface GraphLayoutNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly headerHeight: number;
  readonly rows: readonly GraphLayoutRow[];
  readonly ports: readonly GraphLayoutPort[];
}

export interface GraphLayout {
  readonly width: number;
  readonly height: number;
  readonly bounds: GraphLayoutBounds;
  readonly nodes: readonly GraphLayoutNode[];
}

export interface GraphLayoutOptions {
  readonly margin?: number;
  readonly nodeWidth?: number;
  readonly columnCount?: number;
  readonly columnGap?: number;
  readonly rowGap?: number;
  readonly headerHeight?: number;
  readonly rowHeight?: number;
  readonly documentationHeight?: number;
  readonly documentHeaderHeight?: number;
  readonly minimumWidth?: number;
  readonly minimumHeight?: number;
  readonly secondaryNodeKinds?: readonly string[];
}

interface ResolvedGraphLayoutOptions {
  readonly margin: number;
  readonly nodeWidth: number;
  readonly columnCount: number;
  readonly columnGap: number;
  readonly rowGap: number;
  readonly headerHeight: number;
  readonly rowHeight: number;
  readonly documentationHeight: number;
  readonly documentHeaderHeight: number;
  readonly minimumWidth: number;
  readonly minimumHeight: number;
  readonly secondaryNodeKinds: ReadonlySet<string>;
}

const defaultOptions: ResolvedGraphLayoutOptions = {
  margin: 40,
  nodeWidth: 300,
  columnCount: 2,
  columnGap: 100,
  rowGap: 56,
  headerHeight: 38,
  rowHeight: 28,
  documentationHeight: 26,
  documentHeaderHeight: 54,
  minimumWidth: 640,
  minimumHeight: 240,
  secondaryNodeKinds: new Set(),
};

const titleCharacterWidth = 8;
const rowCharacterWidth = 7;
const badgeCharacterWidth = 6;
const horizontalPadding = 24;
const badgeGap = 8;

export function layoutGraph(
  model: GraphModel,
  options: GraphLayoutOptions = {},
): GraphLayout {
  const resolved = resolveOptions(options);
  const measuredWidths = new Map(
    model.nodes.map((node) => [
      node.id,
      Math.max(resolved.nodeWidth, measureNodeWidth(node)),
    ]),
  );
  const columnWidth = Math.max(resolved.nodeWidth, ...measuredWidths.values());
  const secondaryNodes = model.nodes.filter(
    (node) =>
      node.kind !== undefined && resolved.secondaryNodeKinds.has(node.kind),
  );
  const primaryNodes = model.nodes.filter(
    (node) =>
      node.kind === undefined || !resolved.secondaryNodeKinds.has(node.kind),
  );
  const nodes: GraphLayoutNode[] = [];
  const contentOffset =
    model.documentation === undefined ? 0 : resolved.documentHeaderHeight;
  let primaryY = resolved.margin + contentOffset;

  for (
    let index = 0;
    index < primaryNodes.length;
    index += resolved.columnCount
  ) {
    const rowNodes = primaryNodes.slice(index, index + resolved.columnCount);
    const positioned = rowNodes.map((node, column) =>
      layoutNode(
        node,
        resolved.margin + column * (columnWidth + resolved.columnGap),
        primaryY,
        measuredWidths.get(node.id) ?? resolved.nodeWidth,
        resolved,
      ),
    );
    nodes.push(...positioned);
    primaryY +=
      Math.max(...positioned.map((node) => node.height)) + resolved.rowGap;
  }

  const primaryBottom =
    nodes.length === 0
      ? resolved.margin
      : Math.max(...nodes.map((node) => node.y + node.height));
  const secondaryColumn = Math.min(1, resolved.columnCount - 1);
  const secondaryX =
    resolved.margin + secondaryColumn * (columnWidth + resolved.columnGap);
  let secondaryY =
    primaryNodes.length === 0
      ? resolved.margin
      : primaryBottom + resolved.rowGap;

  for (const node of secondaryNodes) {
    const positioned = layoutNode(
      node,
      secondaryX,
      secondaryY,
      measuredWidths.get(node.id) ?? resolved.nodeWidth,
      resolved,
    );
    nodes.push(positioned);
    secondaryY += positioned.height + resolved.rowGap;
  }

  const bounds = layoutBounds(nodes);
  return {
    width: Math.max(
      resolved.minimumWidth,
      bounds.x + bounds.width + resolved.margin,
    ),
    height: Math.max(
      resolved.minimumHeight,
      bounds.y + bounds.height + resolved.margin,
    ),
    bounds,
    nodes,
  };
}

function resolveOptions(
  options: GraphLayoutOptions,
): ResolvedGraphLayoutOptions {
  const columnCount = options.columnCount ?? defaultOptions.columnCount;
  if (!Number.isInteger(columnCount) || columnCount < 1) {
    throw new RangeError(
      "Graph layout columnCount must be a positive integer.",
    );
  }

  return {
    margin: options.margin ?? defaultOptions.margin,
    nodeWidth: options.nodeWidth ?? defaultOptions.nodeWidth,
    columnCount,
    columnGap: options.columnGap ?? defaultOptions.columnGap,
    rowGap: options.rowGap ?? defaultOptions.rowGap,
    headerHeight: options.headerHeight ?? defaultOptions.headerHeight,
    rowHeight: options.rowHeight ?? defaultOptions.rowHeight,
    documentationHeight:
      options.documentationHeight ?? defaultOptions.documentationHeight,
    documentHeaderHeight:
      options.documentHeaderHeight ?? defaultOptions.documentHeaderHeight,
    minimumWidth: options.minimumWidth ?? defaultOptions.minimumWidth,
    minimumHeight: options.minimumHeight ?? defaultOptions.minimumHeight,
    secondaryNodeKinds: new Set(options.secondaryNodeKinds ?? []),
  };
}

function layoutNode(
  node: GraphNode,
  x: number,
  y: number,
  width: number,
  options: ResolvedGraphLayoutOptions,
): GraphLayoutNode {
  const headerHeight =
    options.headerHeight +
    (node.documentation === undefined ? 0 : options.documentationHeight);
  const graphRows = (node.compartments ?? []).flatMap((compartment) =>
    compartment.rows.map((row) => ({ compartmentId: compartment.id, row })),
  );
  const rows: GraphLayoutRow[] = graphRows.map(
    ({ compartmentId, row }, index) => ({
      nodeId: node.id,
      compartmentId,
      rowId: row.id,
      x,
      y: y + headerHeight + index * options.rowHeight,
      width,
      height: options.rowHeight,
      ...(row.portId === undefined ? {} : { portId: row.portId }),
    }),
  );
  const rowsById = new Map(rows.map((row) => [row.rowId, row]));
  const ports: GraphLayoutPort[] = (node.ports ?? []).map((port) => {
    const row = port.rowId === undefined ? undefined : rowsById.get(port.rowId);
    const centerY =
      row === undefined ? y + headerHeight / 2 : row.y + row.height / 2;
    const side = port.preferredSide;
    const position =
      side === "left"
        ? { x, y: centerY }
        : side === "top"
          ? { x: x + width / 2, y }
          : side === "bottom"
            ? {
                x: x + width / 2,
                y: y + headerHeight + rows.length * options.rowHeight,
              }
            : { x: x + width, y: centerY };
    return {
      id: port.id,
      nodeId: node.id,
      ...position,
      ...(port.rowId === undefined ? {} : { rowId: port.rowId }),
      ...(side === undefined ? {} : { preferredSide: side }),
    };
  });

  return {
    id: node.id,
    x,
    y,
    width,
    height: headerHeight + rows.length * options.rowHeight,
    headerHeight,
    rows,
    ports,
  };
}

function measureNodeWidth(node: GraphNode): number {
  const titleWidth = node.title.length * titleCharacterWidth;
  const nodeBadgeWidth = measureBadges(node.badges);
  const compartmentWidths = (node.compartments ?? []).flatMap((compartment) => [
    (compartment.title?.length ?? 0) * titleCharacterWidth,
    ...compartment.rows.map(
      (row) => row.label.length * rowCharacterWidth + measureBadges(row.badges),
    ),
  ]);
  return (
    Math.max(titleWidth + nodeBadgeWidth, 0, ...compartmentWidths) +
    horizontalPadding
  );
}

function measureBadges(
  badges: readonly { readonly label: string }[] | undefined,
): number {
  if (badges === undefined || badges.length === 0) {
    return 0;
  }
  return (
    badgeGap +
    badges.reduce(
      (width, badge) =>
        width + badge.label.length * badgeCharacterWidth + badgeGap,
      0,
    )
  );
}

function layoutBounds(nodes: readonly GraphLayoutNode[]): GraphLayoutBounds {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const left = Math.min(...nodes.map((node) => node.x));
  const top = Math.min(...nodes.map((node) => node.y));
  const right = Math.max(...nodes.map((node) => node.x + node.width));
  const bottom = Math.max(...nodes.map((node) => node.y + node.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
