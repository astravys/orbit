import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutGraph, routeGraphEdges } from "@orbit/family-graph";
import {
  buildGraphRenderDocument,
  type RenderPrimitive,
} from "@orbit/render-primitives";
import { parseOrbit } from "@orbit/parser";
import { databaseToGraphModel, validateDatabase } from "@orbit/validator";

describe("renderer primitives", () => {
  it("builds deterministic output-neutral Graph primitives without mutation", () => {
    const source = readFileSync(
      "docs/examples/customer-database.orbit",
      "utf8",
    );
    const parsed = parseOrbit(source);
    const validated = validateDatabase(parsed.ast!);
    const graph = databaseToGraphModel(validated.model!);
    const layout = layoutGraph(graph, {
      secondaryNodeKinds: ["database.enum"],
    });
    const routing = routeGraphEdges(graph, layout, {
      endpointPolicy: "nearest-node-boundary",
      targetClearance: 8,
    });
    const inputsBefore = JSON.stringify({ graph, layout, routing });

    const first = buildGraphRenderDocument(graph, layout, routing);
    const second = buildGraphRenderDocument(graph, layout, routing);
    const flattened = flatten(first.primitives);

    expect(first).toEqual(second);
    expect(JSON.stringify({ graph, layout, routing })).toBe(inputsBefore);
    expect(first.width).toBe(layout.width);
    expect(first.height).toBe(layout.height);
    expect(first.primitives[0]).toMatchObject({
      kind: "RenderText",
      styleRole: "document.title",
    });
    expect(
      first.primitives.find((item) => item.kind === "RenderPath"),
    ).toMatchObject({
      markerRole: "arrow.target",
      styleRole: "edge.relationship",
    });
    expect(
      first.primitives.filter((item) => item.kind === "RenderGroup"),
    ).toHaveLength(graph.nodes.length);
    expect(
      flattened.some(
        (item) =>
          item.kind === "RenderRect" && item.styleRole === "node.background",
      ),
    ).toBe(true);
    expect(
      flattened.some(
        (item) =>
          item.kind === "RenderText" && item.styleRole === "badge.primary-key",
      ),
    ).toBe(true);
    expect(
      flattened.some(
        (item) =>
          item.kind === "RenderText" && item.styleRole === "badge.foreign-key",
      ),
    ).toBe(true);
    expect(JSON.stringify(first)).not.toMatch(
      /<rect|<path|marker-end|class=|d=/,
    );
    expect(JSON.stringify(first)).not.toContain("records");
  });
});

function flatten(
  primitives: readonly RenderPrimitive[],
): readonly RenderPrimitive[] {
  return primitives.flatMap((primitive) =>
    primitive.kind === "RenderGroup"
      ? [primitive, ...flatten(primitive.children)]
      : [primitive],
  );
}
