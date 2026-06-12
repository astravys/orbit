/**
 * Internal implementation-family data for graph-like diagrams.
 *
 * Domain models map into these contracts through adapters. They are not ORBIT
 * user syntax and must not contain layout coordinates or SVG-specific data.
 */

export type GraphMetadata = Readonly<Record<string, unknown>>;

export interface GraphBadge {
  label: string;
  kind?: string;
  metadata?: GraphMetadata;
}

export interface GraphRow {
  id: string;
  label: string;
  badges?: readonly GraphBadge[];
  portId?: string;
  metadata?: GraphMetadata;
}

export interface GraphCompartment {
  id: string;
  title?: string;
  rows: readonly GraphRow[];
}

export type GraphPortSide = "top" | "right" | "bottom" | "left";

export interface GraphPort {
  id: string;
  nodeId?: string;
  rowId?: string;
  preferredSide?: GraphPortSide;
  metadata?: GraphMetadata;
}

export interface GraphNode {
  id: string;
  kind?: string;
  title: string;
  compartments?: readonly GraphCompartment[];
  ports?: readonly GraphPort[];
  badges?: readonly GraphBadge[];
  documentation?: string;
  metadata?: GraphMetadata;
}

export interface GraphEdgeEndpoint {
  nodeId: string;
  portId?: string;
  rowId?: string;
}

export type GraphEdgeDirection = "directed" | "undirected" | "bidirectional";

export interface GraphEdge {
  id: string;
  source: GraphEdgeEndpoint;
  target: GraphEdgeEndpoint;
  label?: string;
  direction?: GraphEdgeDirection;
  kind?: string;
  documentation?: string;
  metadata?: GraphMetadata;
}

export interface GraphModel {
  kind: "GraphModel";
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  title?: string;
  documentation?: string;
  metadata?: GraphMetadata;
}
