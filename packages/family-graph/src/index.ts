/**
 * Internal implementation-family data for graph-like diagrams.
 *
 * Domain models map into these contracts through adapters. They are not ORBIT
 * user syntax and must not contain layout coordinates or SVG-specific data.
 */

export type GraphMetadata = Readonly<Record<string, unknown>>;

export interface GraphBadge {
  readonly label: string;
  readonly kind?: string;
  readonly metadata?: GraphMetadata;
}

export interface GraphRow {
  readonly id: string;
  readonly label: string;
  readonly badges?: readonly GraphBadge[];
  readonly portId?: string;
  readonly metadata?: GraphMetadata;
}

export interface GraphCompartment {
  readonly id: string;
  readonly title?: string;
  readonly rows: readonly GraphRow[];
  readonly documentation?: string;
  readonly metadata?: GraphMetadata;
}

export type GraphPortSide = "top" | "right" | "bottom" | "left";

export interface GraphPort {
  readonly id: string;
  readonly rowId?: string;
  readonly preferredSide?: GraphPortSide;
  readonly metadata?: GraphMetadata;
}

export interface GraphNode {
  readonly id: string;
  readonly kind?: string;
  readonly title: string;
  readonly compartments?: readonly GraphCompartment[];
  readonly ports?: readonly GraphPort[];
  readonly badges?: readonly GraphBadge[];
  readonly documentation?: string;
  readonly metadata?: GraphMetadata;
}

export interface GraphEdgeEndpoint {
  readonly nodeId: string;
  readonly portId?: string;
  readonly rowId?: string;
}

export type GraphEdgeDirection = "directed" | "undirected" | "bidirectional";

export interface GraphEdge {
  readonly id: string;
  readonly source: GraphEdgeEndpoint;
  readonly target: GraphEdgeEndpoint;
  readonly label?: string;
  readonly direction?: GraphEdgeDirection;
  readonly kind?: string;
  readonly documentation?: string;
  readonly metadata?: GraphMetadata;
}

export interface GraphModel {
  readonly kind: "GraphModel";
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly GraphEdge[];
  readonly title?: string;
  readonly documentation?: string;
  readonly metadata?: GraphMetadata;
}
