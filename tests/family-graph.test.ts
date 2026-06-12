import { describe, expect, it } from "vitest";
import type { GraphModel } from "@orbit/family-graph";

const graphFixture = {
  kind: "GraphModel",
  title: "Order data",
  nodes: [
    {
      id: "orders",
      kind: "entity",
      title: "Orders",
      badges: [{ label: "aggregate", kind: "category" }],
      compartments: [
        {
          id: "fields",
          title: "Fields",
          rows: [
            {
              id: "user-id",
              label: "user_id",
              badges: [{ label: "reference", kind: "relation" }],
              portId: "orders-user-id",
            },
          ],
        },
      ],
      ports: [
        {
          id: "orders-user-id",
          rowId: "user-id",
          preferredSide: "right",
        },
      ],
    },
    {
      id: "users",
      kind: "entity",
      title: "Users",
      compartments: [
        {
          id: "fields",
          rows: [{ id: "id", label: "id", portId: "users-id" }],
        },
      ],
      ports: [{ id: "users-id", rowId: "id", preferredSide: "left" }],
    },
  ],
  edges: [
    {
      id: "order-user",
      kind: "reference",
      source: {
        nodeId: "orders",
        rowId: "user-id",
        portId: "orders-user-id",
      },
      target: { nodeId: "users", rowId: "id", portId: "users-id" },
      direction: "directed",
    },
  ],
} satisfies GraphModel;

describe("Graph family model", () => {
  it("represents compartment nodes, row ports, badges, and directed edges", () => {
    expect(graphFixture.nodes).toHaveLength(2);
    expect(graphFixture.edges[0]?.direction).toBe("directed");
  });
});
