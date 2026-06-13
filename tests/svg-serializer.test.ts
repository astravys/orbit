import { describe, expect, it } from "vitest";
import type { RenderDocument, RenderPrimitive } from "@orbit/render-primitives";
import { renderDocumentToSvg } from "@orbit/renderer-svg";

const document: RenderDocument = {
  kind: "RenderDocument",
  width: 200,
  height: 120,
  title: `A & "B"`,
  documentation: "A < B > C",
  primitives: [
    {
      kind: "RenderGroup",
      id: `group-"one"`,
      children: [
        {
          kind: "RenderRect",
          id: "background",
          x: 10,
          y: 10,
          width: 100,
          height: 50,
          radius: 6,
          styleRole: "node.background",
        },
        {
          kind: "RenderText",
          id: "title",
          x: 20,
          y: 30,
          text: `A & <B> "C"`,
          anchor: "middle",
          baseline: "hanging",
          styleRole: "node.title",
        },
        {
          kind: "RenderLine",
          id: "divider",
          x1: 10,
          y1: 40,
          x2: 110,
          y2: 40,
          styleRole: "compartment.separator",
        },
      ],
    },
    {
      kind: "RenderPath",
      id: `edge-"one"`,
      commands: [
        { kind: "move", x: 110, y: 40 },
        { kind: "horizontal", x: 150 },
        { kind: "vertical", y: 80 },
        { kind: "line", x: 180, y: 80 },
        {
          kind: "quadratic",
          controlX: 190,
          controlY: 80,
          x: 190,
          y: 90,
        },
        { kind: "close" },
      ],
      markerRole: "arrow.target",
      styleRole: "edge.relationship",
      semanticKind: "graph.edge",
      title: "A > B",
    },
  ],
};

describe("SVG primitive serializer", () => {
  it("serializes supported primitives, escapes XML, and preserves order", () => {
    const svg = renderDocumentToSvg(document);

    expect(svg).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg/);
    expect(svg).toContain(
      `<title id="orbit-title">A &amp; &quot;B&quot;</title>`,
    );
    expect(svg).toContain(
      `<desc id="orbit-description">A &lt; B &gt; C</desc>`,
    );
    expect(svg).toContain(`<g id="group-&quot;one&quot;">`);
    expect(svg).toContain(
      `<rect class="box" x="10" y="10" width="100" height="50" rx="6" />`,
    );
    expect(svg).toContain(
      `<text class="title" x="20" y="30" text-anchor="middle" dominant-baseline="hanging">A &amp; &lt;B&gt; &quot;C&quot;</text>`,
    );
    expect(svg).toContain(
      `<line class="divider" x1="10" y1="40" x2="110" y2="40" />`,
    );
    expect(svg).toContain(
      `<path id="edge-&quot;one&quot;" class="relationship" d="M 110 40 H 150 V 80 L 180 80 Q 190 80 190 90 Z" marker-end="url(#arrow)" />`,
    );
    expect(svg).toContain(`<title>A &gt; B</title>`);
    expect(svg.indexOf("<g ")).toBeLessThan(svg.indexOf('<path id="edge-'));
  });

  it("rejects unsupported primitive kinds and invalid coordinates", () => {
    const unsupported = {
      ...document,
      primitives: [{ kind: "RenderCircle", id: "circle" }],
    } as unknown as RenderDocument;
    expect(() => renderDocumentToSvg(unsupported)).toThrow();

    const invalidCoordinate: RenderDocument = {
      ...document,
      primitives: [
        {
          kind: "RenderText",
          id: "invalid",
          x: Number.NaN,
          y: 0,
          text: "invalid",
        },
      ],
    };
    expect(() => renderDocumentToSvg(invalidCoordinate)).toThrow(
      "SVG coordinates must be finite",
    );
  });

  it("rejects unknown style roles", () => {
    const primitive: RenderPrimitive = {
      kind: "RenderText",
      id: "unknown-style",
      x: 0,
      y: 0,
      text: "text",
      styleRole: "unknown.style",
    };
    expect(() =>
      renderDocumentToSvg({ ...document, primitives: [primitive] }),
    ).toThrow("Unsupported SVG style role");
  });

  it("rejects invalid text attribute values at runtime", () => {
    const invalidText = {
      kind: "RenderText",
      id: "invalid-anchor",
      x: 0,
      y: 0,
      text: "text",
      anchor: `start" onload="alert(1)`,
    } as unknown as RenderPrimitive;
    expect(() =>
      renderDocumentToSvg({ ...document, primitives: [invalidText] }),
    ).toThrow("Unsupported SVG text anchor");
  });
});
