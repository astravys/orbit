import { describe, expect, it } from "vitest";
import { parseOrbit } from "@orbit/parser";
import { databaseToGraphModel, validateDatabase } from "@orbit/validator";

describe("database to Graph adapter", () => {
  it("maps validated schema elements without representing records", () => {
    const parsed = parseOrbit(`
"""
Customer database
Used by order management.
"""
diagram database;

"""
Order lifecycle states.
"""
enum order_status {
  pending;
  paid;
};

"""
Application users.
"""
table users {
  column id int {
    pk;
    auto_increment;
  };
  column email string {
    unique;
    not_null;
  };
};

table orders {
  column id int {
    pk;
  };
  column user_id int {
    not_null;
  };
  column status order_status;
};

"""
Each order belongs to a user.
"""
relationship user_orders {
  orders.user_id -> users.id;
};

records users {
  { id: 1, email: "user@example.com" };
};
`);

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.ast).toBeDefined();

    const validated = validateDatabase(parsed.ast!);
    expect(validated.diagnostics).toEqual([]);
    expect(validated.model).toBeDefined();

    const graph = databaseToGraphModel(validated.model!);

    expect(graph).toMatchObject({
      kind: "GraphModel",
      title: "Customer database",
      documentation: "Customer database\nUsed by order management.",
      metadata: { domain: "database" },
    });
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(1);

    const users = graph.nodes.find((node) => node.id === "table:users");
    expect(users).toMatchObject({
      kind: "database.table",
      title: "users",
      documentation: "Application users.",
      metadata: { tableName: "users" },
    });
    expect(users?.compartments).toHaveLength(1);
    expect(users?.compartments?.[0]).toMatchObject({
      id: "columns",
      title: "Columns",
    });
    expect(users?.compartments?.[0]?.rows).toEqual([
      expect.objectContaining({
        id: "column:users.id",
        label: "id: int",
        portId: "port:users.id",
        badges: [
          { label: "PK", kind: "database.column.pk" },
          { label: "AI", kind: "database.column.auto-increment" },
        ],
      }),
      expect.objectContaining({
        id: "column:users.email",
        label: "email: string",
        badges: [
          { label: "UQ", kind: "database.column.unique" },
          { label: "NN", kind: "database.column.not-null" },
        ],
      }),
    ]);

    const orders = graph.nodes.find((node) => node.id === "table:orders");
    const userIdRow = orders?.compartments?.[0]?.rows.find(
      (row) => row.id === "column:orders.user_id",
    );
    expect(userIdRow).toMatchObject({
      label: "user_id: int",
      portId: "port:orders.user_id",
      badges: [
        { label: "FK", kind: "database.column.foreign-key" },
        { label: "NN", kind: "database.column.not-null" },
      ],
    });
    expect(orders?.ports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "port:orders.user_id",
          rowId: "column:orders.user_id",
          preferredSide: "right",
        }),
      ]),
    );
    expect(users?.ports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "port:users.id",
          rowId: "column:users.id",
          preferredSide: "left",
        }),
      ]),
    );

    const status = graph.nodes.find((node) => node.id === "enum:order_status");
    expect(status).toMatchObject({
      kind: "database.enum",
      title: "order_status",
      documentation: "Order lifecycle states.",
    });
    expect(status?.compartments?.[0]?.rows).toEqual([
      { id: "enum-member:order_status.pending", label: "pending" },
      { id: "enum-member:order_status.paid", label: "paid" },
    ]);

    expect(graph.edges[0]).toEqual({
      id: "relationship:user_orders",
      kind: "database.relationship",
      source: {
        nodeId: "table:orders",
        rowId: "column:orders.user_id",
        portId: "port:orders.user_id",
      },
      target: {
        nodeId: "table:users",
        rowId: "column:users.id",
        portId: "port:users.id",
      },
      label: "user_orders",
      direction: "directed",
      documentation: "Each order belongs to a user.",
      metadata: { relationshipName: "user_orders" },
    });

    const graphIds = JSON.stringify(graph);
    expect(graphIds).not.toContain("user@example.com");
    expect(graphIds).not.toContain("records");
  });
});
