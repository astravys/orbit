import { describe, expect, it } from "vitest";
import {
  layoutGraph,
  routeGraphEdges,
  type GraphModel,
} from "@orbit/family-graph";

const graphFixture = {
  kind: "GraphModel",
  nodes: [
    {
      id: "left",
      title: "Left",
      compartments: [
        {
          id: "rows",
          rows: [{ id: "left-row", label: "left", portId: "left-port" }],
        },
      ],
      ports: [
        {
          id: "left-port",
          rowId: "left-row",
          preferredSide: "right",
        },
      ],
    },
    {
      id: "right",
      title: "Right",
      compartments: [
        {
          id: "rows",
          rows: [{ id: "right-row", label: "right", portId: "right-port" }],
        },
      ],
      ports: [
        {
          id: "right-port",
          rowId: "right-row",
          preferredSide: "left",
        },
      ],
    },
  ],
  edges: [
    {
      id: "port-edge",
      source: {
        nodeId: "left",
        rowId: "left-row",
        portId: "left-port",
      },
      target: {
        nodeId: "right",
        rowId: "right-row",
        portId: "right-port",
      },
      direction: "directed",
    },
    {
      id: "row-edge",
      source: { nodeId: "left", rowId: "left-row" },
      target: { nodeId: "right", rowId: "right-row" },
      direction: "directed",
    },
    {
      id: "node-edge",
      source: { nodeId: "left" },
      target: { nodeId: "right" },
      direction: "directed",
    },
  ],
} satisfies GraphModel;

describe("Graph routing", () => {
  it("routes ports, rows, and nodes deterministically without mutation", () => {
    const layout = layoutGraph(graphFixture);
    const modelBefore = structuredClone(graphFixture);
    const layoutBefore = structuredClone(layout);
    const first = routeGraphEdges(graphFixture, layout);
    const second = routeGraphEdges(graphFixture, layout);

    expect(first).toEqual(second);
    expect(graphFixture).toEqual(modelBefore);
    expect(layout).toEqual(layoutBefore);
    expect(first.edges.map((edge) => edge.id)).toEqual([
      "port-edge",
      "row-edge",
      "node-edge",
    ]);

    const sourcePort = layout.nodes[0]!.ports[0]!;
    const targetPort = layout.nodes[1]!.ports[0]!;
    const portEdge = first.edges[0]!;
    expect(portEdge.source.point).toEqual({
      x: sourcePort.x,
      y: sourcePort.y,
    });
    expect(portEdge.target.point).toEqual({
      x: targetPort.x,
      y: targetPort.y,
    });
    expect(portEdge.targetDirection).toBe("right");

    const sourceRow = layout.nodes[0]!.rows[0]!;
    const targetRow = layout.nodes[1]!.rows[0]!;
    const rowEdge = first.edges[1]!;
    expect(rowEdge.source.point.y).toBe(sourceRow.y + sourceRow.height / 2);
    expect(rowEdge.target.point.y).toBe(targetRow.y + targetRow.height / 2);

    const nodeEdge = first.edges[2]!;
    expect(nodeEdge.source.side).toBe("right");
    expect(nodeEdge.target.side).toBe("left");

    for (const edge of first.edges) {
      for (let index = 1; index < edge.points.length; index += 1) {
        const previous = edge.points[index - 1]!;
        const point = edge.points[index]!;
        expect(point.x === previous.x || point.y === previous.y).toBe(true);
      }
    }
  });

  it("supports top and bottom ports with a vertical final segment", () => {
    const model = {
      kind: "GraphModel",
      nodes: [
        {
          id: "top",
          title: "Top",
          ports: [{ id: "bottom-port", preferredSide: "bottom" }],
        },
        {
          id: "bottom",
          title: "Bottom",
          ports: [{ id: "top-port", preferredSide: "top" }],
        },
      ],
      edges: [
        {
          id: "vertical",
          source: { nodeId: "top", portId: "bottom-port" },
          target: { nodeId: "bottom", portId: "top-port" },
        },
      ],
    } satisfies GraphModel;
    const layout = layoutGraph(model, { columnCount: 1 });
    const routing = routeGraphEdges(model, layout);

    expect(routing.edges[0]?.targetDirection).toBe("down");
    const points = routing.edges[0]!.points;
    expect(points.at(-1)?.x).toBe(points.at(-2)?.x);
  });

  it("preserves legacy boundary selection for vertically aligned nodes", () => {
    const model = {
      ...graphFixture,
      edges: [
        {
          id: "aligned",
          source: { nodeId: "left", rowId: "left-row" },
          target: { nodeId: "right", rowId: "right-row" },
        },
      ],
    } satisfies GraphModel;
    const layout = layoutGraph(model, { columnCount: 1 });
    const routing = routeGraphEdges(model, layout, {
      endpointPolicy: "nearest-node-boundary",
      targetClearance: 8,
    });
    const sourceNode = layout.nodes[0]!;
    const targetNode = layout.nodes[1]!;

    expect(routing.edges[0]?.source.point.x).toBe(sourceNode.x);
    expect(routing.edges[0]?.target.point.x).toBe(
      targetNode.x + targetNode.width + 8,
    );
  });

  it("throws descriptive errors for missing endpoint references", () => {
    const layout = layoutGraph(graphFixture);
    const missingNode = {
      ...graphFixture,
      edges: [
        {
          id: "missing-node",
          source: { nodeId: "absent" },
          target: { nodeId: "right" },
        },
      ],
    } satisfies GraphModel;
    expect(() => routeGraphEdges(missingNode, layout)).toThrow(
      "source node 'absent' was not found",
    );

    const missingPort = {
      ...graphFixture,
      edges: [
        {
          id: "missing-port",
          source: { nodeId: "left", portId: "absent" },
          target: { nodeId: "right" },
        },
      ],
    } satisfies GraphModel;
    expect(() => routeGraphEdges(missingPort, layout)).toThrow(
      "source port 'absent' was not found",
    );

    const missingRow = {
      ...graphFixture,
      edges: [
        {
          id: "missing-row",
          source: { nodeId: "left", rowId: "absent" },
          target: { nodeId: "right" },
        },
      ],
    } satisfies GraphModel;
    expect(() => routeGraphEdges(missingRow, layout)).toThrow(
      "source row 'absent' was not found",
    );
  });

  it("returns an empty result for a graph without edges", () => {
    const model = {
      kind: "GraphModel",
      nodes: [],
      edges: [],
    } satisfies GraphModel;
    expect(routeGraphEdges(model, layoutGraph(model))).toEqual({ edges: [] });
  });
});
