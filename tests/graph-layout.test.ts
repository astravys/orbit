import { describe, expect, it } from "vitest";
import {
  layoutGraph,
  type GraphLayoutNode,
  type GraphModel,
} from "@orbit/family-graph";

const graphFixture = {
  kind: "GraphModel",
  title: "Service topology",
  documentation: "Service topology",
  nodes: [
    {
      id: "service:api",
      kind: "service",
      title: "API",
      compartments: [
        {
          id: "operations",
          rows: [
            {
              id: "operation:get",
              label: "GET /items",
              badges: [{ label: "HTTP" }],
              portId: "port:get",
            },
          ],
        },
      ],
      ports: [
        {
          id: "port:get",
          rowId: "operation:get",
          preferredSide: "right",
        },
      ],
    },
    {
      id: "service:worker",
      kind: "service",
      title: "Worker",
      compartments: [
        {
          id: "jobs",
          rows: [{ id: "job:sync", label: "sync" }],
        },
      ],
    },
    {
      id: "legend:status",
      kind: "legend",
      title: "Status",
      compartments: [
        {
          id: "values",
          rows: [
            { id: "status:ready", label: "ready" },
            { id: "status:failed", label: "failed" },
          ],
        },
      ],
    },
  ],
  edges: [],
} satisfies GraphModel;

describe("Graph layout", () => {
  it("positions generic graph nodes deterministically without overlap", () => {
    const original = structuredClone(graphFixture);
    const first = layoutGraph(graphFixture, {
      secondaryNodeKinds: ["legend"],
    });
    const second = layoutGraph(graphFixture, {
      secondaryNodeKinds: ["legend"],
    });

    expect(first).toEqual(second);
    expect(graphFixture).toEqual(original);
    expect(first.nodes.map((node) => node.id)).toEqual([
      "service:api",
      "service:worker",
      "legend:status",
    ]);

    for (const node of first.nodes) {
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(node.width).toBeGreaterThan(0);
      expect(node.height).toBeGreaterThan(0);
      expect(first.bounds.x + first.bounds.width).toBeGreaterThanOrEqual(
        node.x + node.width,
      );
      expect(first.bounds.y + first.bounds.height).toBeGreaterThanOrEqual(
        node.y + node.height,
      );
    }

    for (let index = 0; index < first.nodes.length; index += 1) {
      for (
        let candidate = index + 1;
        candidate < first.nodes.length;
        candidate += 1
      ) {
        expect(overlaps(first.nodes[index]!, first.nodes[candidate]!)).toBe(
          false,
        );
      }
    }

    const api = first.nodes[0]!;
    const row = api.rows[0]!;
    const port = api.ports[0]!;
    expect(row.nodeId).toBe(api.id);
    expect(row.y).toBeGreaterThanOrEqual(api.y + api.headerHeight);
    expect(row.y + row.height).toBeLessThanOrEqual(api.y + api.height);
    expect(port).toMatchObject({
      id: "port:get",
      nodeId: api.id,
      rowId: row.rowId,
      x: api.x + api.width,
      y: row.y + row.height / 2,
    });
  });

  it("defines empty and minimal graph bounds", () => {
    const empty = layoutGraph({
      kind: "GraphModel",
      nodes: [],
      edges: [],
    });
    expect(empty).toEqual({
      width: 640,
      height: 240,
      bounds: { x: 0, y: 0, width: 0, height: 0 },
      nodes: [],
    });

    const minimal = layoutGraph({
      kind: "GraphModel",
      nodes: [{ id: "node", title: "Node" }],
      edges: [],
    });
    expect(minimal.nodes[0]).toMatchObject({
      id: "node",
      x: 40,
      y: 40,
      width: 300,
      height: 38,
      rows: [],
      ports: [],
    });

    const wide = layoutGraph({
      kind: "GraphModel",
      nodes: [
        {
          id: "wide",
          title: "A node title that is intentionally much wider than default",
          compartments: [
            {
              id: "details",
              title: "Details",
              rows: [
                {
                  id: "wide-row",
                  label: "A long row label",
                  badges: [{ label: "important" }],
                },
              ],
            },
          ],
        },
      ],
      edges: [],
    });
    expect(wide.nodes[0]!.width).toBeGreaterThan(300);
  });

  it("keeps secondary-only nodes below document documentation", () => {
    const layout = layoutGraph(
      {
        kind: "GraphModel",
        documentation: "Document title",
        nodes: [{ id: "legend", kind: "legend", title: "Legend" }],
        edges: [],
      },
      { secondaryNodeKinds: ["legend"] },
    );

    expect(layout.nodes[0]?.y).toBe(94);
  });
});

function overlaps(left: GraphLayoutNode, right: GraphLayoutNode): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}
