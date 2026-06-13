import type {
  GraphEdge,
  GraphEdgeEndpoint,
  GraphModel,
  GraphPortSide,
} from "./index.js";
import type {
  GraphLayout,
  GraphLayoutNode,
  GraphLayoutPort,
  GraphLayoutRow,
} from "./layout.js";

export type GraphRouteDirection = "left" | "right" | "up" | "down";

export interface GraphRoutePoint {
  readonly x: number;
  readonly y: number;
}

export interface GraphRoutedEndpoint {
  readonly nodeId: string;
  readonly point: GraphRoutePoint;
  readonly side: GraphPortSide;
  readonly rowId?: string;
  readonly portId?: string;
}

export interface GraphRoutedEdge {
  readonly id: string;
  readonly points: readonly GraphRoutePoint[];
  readonly source: GraphRoutedEndpoint;
  readonly target: GraphRoutedEndpoint;
  readonly targetDirection: GraphRouteDirection;
}

export interface GraphRouting {
  readonly edges: readonly GraphRoutedEdge[];
}

export interface GraphRoutingOptions {
  /**
   * `explicit` resolves port, then row, then node geometry.
   * `nearest-node-boundary` keeps row/port height but selects the nearest
   * horizontal node boundary for compatibility with the Wave 1 renderer.
   */
  readonly endpointPolicy?: "explicit" | "nearest-node-boundary";
  readonly targetClearance?: number;
}

interface LayoutLookups {
  readonly nodes: ReadonlyMap<string, GraphLayoutNode>;
  readonly rows: ReadonlyMap<string, GraphLayoutRow>;
  readonly ports: ReadonlyMap<string, GraphLayoutPort>;
}

interface ResolvedEndpoint extends GraphRoutedEndpoint {
  readonly node: GraphLayoutNode;
}

export function routeGraphEdges(
  model: GraphModel,
  layout: GraphLayout,
  options: GraphRoutingOptions = {},
): GraphRouting {
  const lookups = createLookups(layout);
  const endpointPolicy = options.endpointPolicy ?? "explicit";
  const targetClearance = options.targetClearance ?? 0;
  if (!Number.isFinite(targetClearance) || targetClearance < 0) {
    throw new RangeError(
      "Graph routing targetClearance must be a finite non-negative number.",
    );
  }

  return {
    edges: model.edges.map((edge) =>
      routeEdge(edge, lookups, endpointPolicy, targetClearance),
    ),
  };
}

function createLookups(layout: GraphLayout): LayoutLookups {
  return {
    nodes: new Map(layout.nodes.map((node) => [node.id, node])),
    rows: new Map(
      layout.nodes.flatMap((node) =>
        node.rows.map((row) => [lookupKey(node.id, row.rowId), row] as const),
      ),
    ),
    ports: new Map(
      layout.nodes.flatMap((node) =>
        node.ports.map((port) => [lookupKey(node.id, port.id), port] as const),
      ),
    ),
  };
}

function routeEdge(
  edge: GraphEdge,
  lookups: LayoutLookups,
  endpointPolicy: NonNullable<GraphRoutingOptions["endpointPolicy"]>,
  targetClearance: number,
): GraphRoutedEdge {
  const sourceNode = requireNode(edge, "source", edge.source, lookups);
  const targetNode = requireNode(edge, "target", edge.target, lookups);
  const source = resolveEndpoint(
    edge,
    "source",
    edge.source,
    sourceNode,
    targetNode,
    endpointPolicy,
    lookups,
  );
  const unresolvedTarget = resolveEndpoint(
    edge,
    "target",
    edge.target,
    targetNode,
    sourceNode,
    endpointPolicy,
    lookups,
  );
  const target = {
    ...unresolvedTarget,
    point: moveOutward(
      unresolvedTarget.point,
      unresolvedTarget.side,
      targetClearance,
    ),
  };
  const points = orthogonalPoints(source, target);

  return {
    id: edge.id,
    points,
    source: publicEndpoint(source),
    target: publicEndpoint(target),
    targetDirection: finalDirection(points, target.side),
  };
}

function requireNode(
  edge: GraphEdge,
  role: "source" | "target",
  endpoint: GraphEdgeEndpoint,
  lookups: LayoutLookups,
): GraphLayoutNode {
  const node = lookups.nodes.get(endpoint.nodeId);
  if (node === undefined) {
    throw routingError(
      edge,
      `${role} node '${endpoint.nodeId}' was not found in GraphLayout`,
    );
  }
  return node;
}

function resolveEndpoint(
  edge: GraphEdge,
  role: "source" | "target",
  endpoint: GraphEdgeEndpoint,
  node: GraphLayoutNode,
  otherNode: GraphLayoutNode,
  endpointPolicy: NonNullable<GraphRoutingOptions["endpointPolicy"]>,
  lookups: LayoutLookups,
): ResolvedEndpoint {
  const port =
    endpoint.portId === undefined
      ? undefined
      : requirePort(edge, role, endpoint, node, lookups);
  const rowId = endpoint.rowId ?? port?.rowId;
  const row =
    rowId === undefined
      ? undefined
      : requireRow(edge, role, node.id, rowId, lookups);

  if (
    port !== undefined &&
    endpoint.rowId !== undefined &&
    port.rowId !== undefined &&
    endpoint.rowId !== port.rowId
  ) {
    throw routingError(
      edge,
      `${role} port '${endpoint.portId}' belongs to row '${port.rowId}', not '${endpoint.rowId}'`,
    );
  }

  if (endpointPolicy === "explicit" && port !== undefined) {
    return {
      node,
      nodeId: node.id,
      point: { x: port.x, y: port.y },
      side: port.preferredSide ?? inferBoundarySide(node, port),
      ...(rowId === undefined ? {} : { rowId }),
      ...(endpoint.portId === undefined ? {} : { portId: endpoint.portId }),
    };
  }

  const side = chooseBoundarySide(
    node,
    otherNode,
    role,
    endpointPolicy === "nearest-node-boundary",
  );
  const point = boundaryPoint(node, side, row);
  return {
    node,
    nodeId: node.id,
    point,
    side,
    ...(rowId === undefined ? {} : { rowId }),
    ...(endpoint.portId === undefined ? {} : { portId: endpoint.portId }),
  };
}

function requirePort(
  edge: GraphEdge,
  role: "source" | "target",
  endpoint: GraphEdgeEndpoint,
  node: GraphLayoutNode,
  lookups: LayoutLookups,
): GraphLayoutPort {
  const port = lookups.ports.get(lookupKey(node.id, endpoint.portId!));
  if (port === undefined) {
    throw routingError(
      edge,
      `${role} port '${endpoint.portId}' was not found on node '${node.id}'`,
    );
  }
  return port;
}

function requireRow(
  edge: GraphEdge,
  role: "source" | "target",
  nodeId: string,
  rowId: string,
  lookups: LayoutLookups,
): GraphLayoutRow {
  const row = lookups.rows.get(lookupKey(nodeId, rowId));
  if (row === undefined) {
    throw routingError(
      edge,
      `${role} row '${rowId}' was not found on node '${nodeId}'`,
    );
  }
  return row;
}

function chooseBoundarySide(
  node: GraphLayoutNode,
  otherNode: GraphLayoutNode,
  role: "source" | "target",
  horizontalOnly: boolean,
): GraphPortSide {
  const nodeCenter = nodeCenterPoint(node);
  const otherCenter = nodeCenterPoint(otherNode);
  const deltaX = otherCenter.x - nodeCenter.x;
  const deltaY = otherCenter.y - nodeCenter.y;

  if (horizontalOnly || Math.abs(deltaX) >= Math.abs(deltaY)) {
    if (deltaX > 0) {
      return "right";
    }
    if (deltaX < 0) {
      return "left";
    }
    return horizontalOnly
      ? role === "source"
        ? "left"
        : "right"
      : role === "source"
        ? "right"
        : "left";
  }
  if (deltaY > 0) {
    return "bottom";
  }
  if (deltaY < 0) {
    return "top";
  }
  return role === "source" ? "bottom" : "top";
}

function boundaryPoint(
  node: GraphLayoutNode,
  side: GraphPortSide,
  row: GraphLayoutRow | undefined,
): GraphRoutePoint {
  const rowCenterY =
    row === undefined ? node.y + node.height / 2 : row.y + row.height / 2;
  switch (side) {
    case "left":
      return { x: node.x, y: rowCenterY };
    case "right":
      return { x: node.x + node.width, y: rowCenterY };
    case "top":
      return { x: node.x + node.width / 2, y: node.y };
    case "bottom":
      return { x: node.x + node.width / 2, y: node.y + node.height };
  }
}

function orthogonalPoints(
  source: ResolvedEndpoint,
  target: ResolvedEndpoint,
): readonly GraphRoutePoint[] {
  const start = source.point;
  const end = target.point;
  const candidates =
    target.side === "top" || target.side === "bottom"
      ? [
          start,
          { x: start.x, y: (start.y + end.y) / 2 },
          { x: end.x, y: (start.y + end.y) / 2 },
          end,
        ]
      : [
          start,
          { x: (start.x + end.x) / 2, y: start.y },
          { x: (start.x + end.x) / 2, y: end.y },
          end,
        ];
  return candidates.filter(
    (point, index) =>
      index === 0 ||
      point.x !== candidates[index - 1]!.x ||
      point.y !== candidates[index - 1]!.y,
  );
}

function moveOutward(
  point: GraphRoutePoint,
  side: GraphPortSide,
  distance: number,
): GraphRoutePoint {
  switch (side) {
    case "left":
      return { x: point.x - distance, y: point.y };
    case "right":
      return { x: point.x + distance, y: point.y };
    case "top":
      return { x: point.x, y: point.y - distance };
    case "bottom":
      return { x: point.x, y: point.y + distance };
  }
}

function finalDirection(
  points: readonly GraphRoutePoint[],
  targetSide: GraphPortSide,
): GraphRouteDirection {
  for (let index = points.length - 1; index > 0; index -= 1) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    if (current.x > previous.x) {
      return "right";
    }
    if (current.x < previous.x) {
      return "left";
    }
    if (current.y > previous.y) {
      return "down";
    }
    if (current.y < previous.y) {
      return "up";
    }
  }
  switch (targetSide) {
    case "left":
      return "right";
    case "right":
      return "left";
    case "top":
      return "down";
    case "bottom":
      return "up";
  }
}

function inferBoundarySide(
  node: GraphLayoutNode,
  point: GraphRoutePoint,
): GraphPortSide {
  if (point.x === node.x) {
    return "left";
  }
  if (point.x === node.x + node.width) {
    return "right";
  }
  if (point.y === node.y) {
    return "top";
  }
  if (point.y === node.y + node.height) {
    return "bottom";
  }
  return "right";
}

function nodeCenterPoint(node: GraphLayoutNode): GraphRoutePoint {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function publicEndpoint(endpoint: ResolvedEndpoint): GraphRoutedEndpoint {
  return {
    nodeId: endpoint.nodeId,
    point: endpoint.point,
    side: endpoint.side,
    ...(endpoint.rowId === undefined ? {} : { rowId: endpoint.rowId }),
    ...(endpoint.portId === undefined ? {} : { portId: endpoint.portId }),
  };
}

function lookupKey(nodeId: string, localId: string): string {
  return `${nodeId}\u0000${localId}`;
}

function routingError(edge: GraphEdge, message: string): Error {
  return new Error(`Cannot route Graph edge '${edge.id}': ${message}.`);
}
