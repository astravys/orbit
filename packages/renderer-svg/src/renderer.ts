import type {
  ValidatedDatabaseModel,
  ValidatedEnum,
  ValidatedTable,
} from "@orbit/core";

interface Box {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly headerHeight: number;
  readonly rowHeight: number;
  readonly rows: readonly BoxRow[];
  readonly documentation?: string;
}

interface BoxRow {
  readonly text: string;
  readonly key?: "PK" | "FK";
}

const margin = 40;
const boxWidth = 300;
const columnGap = 100;
const rowGap = 56;
const headerHeight = 38;
const rowHeight = 28;
const documentationLineHeight = 18;
const documentHeaderHeight = 54;

export function renderDatabaseSvg(model: ValidatedDatabaseModel): string {
  const boxes = layout(model);
  const width = Math.max(
    640,
    ...boxes.map((box) => box.x + box.width + margin),
  );
  const height = Math.max(
    240,
    ...boxes.map((box) => box.y + box.height + margin),
  );
  const tableBoxes = new Map(
    boxes
      .filter((box) => box.id.startsWith("table-"))
      .map((box) => [box.name, box]),
  );

  const relationships = model.relationships
    .map((relationship, index) => {
      const source = tableBoxes.get(relationship.source.table.name);
      const target = tableBoxes.get(relationship.target.table.name);
      if (source === undefined || target === undefined) {
        return "";
      }
      const sourceColumnIndex = relationship.source.table.columns.findIndex(
        (column) => column.name === relationship.source.column.name,
      );
      const targetColumnIndex = relationship.target.table.columns.findIndex(
        (column) => column.name === relationship.target.column.name,
      );
      const sourceIsLeft = source.x < target.x;
      const startX = sourceIsLeft ? source.x + source.width : source.x;
      const startY =
        source.y +
        source.headerHeight +
        sourceColumnIndex * source.rowHeight +
        source.rowHeight / 2;
      const endX = sourceIsLeft ? target.x - 8 : target.x + target.width + 8;
      const endY =
        target.y +
        target.headerHeight +
        targetColumnIndex * target.rowHeight +
        target.rowHeight / 2;
      const middleX = (startX + endX) / 2;
      return [
        `<path id="relationship-${index}-${slug(relationship.name)}" class="relationship" d="M ${startX} ${startY} H ${middleX} V ${endY} H ${endX}" marker-end="url(#arrow)" />`,
        `<title>${escapeXml(relationship.name)}</title>`,
      ].join("");
    })
    .join("\n");

  const title = model.documentation ?? "ORBIT database schema";
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="orbit-title orbit-description">`,
    `<title id="orbit-title">${escapeXml(title.split("\n")[0] ?? title)}</title>`,
    `<desc id="orbit-description">${escapeXml(title)}</desc>`,
    `<defs>`,
    `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/></marker>`,
    `</defs>`,
    `<style>`,
    `.box{fill:#fff;stroke:#334155;stroke-width:1.5}.header{fill:#e2e8f0}.enum-header{fill:#ede9fe}.divider{stroke:#cbd5e1}.document-title{font:600 18px system-ui,sans-serif;fill:#0f172a}.title{font:600 15px system-ui,sans-serif;fill:#0f172a}.row{font:13px ui-monospace,monospace;fill:#1e293b}.row-pk{font-weight:700;fill:#7c2d12}.row-fk{font-weight:700;fill:#1d4ed8}.key-badge{font:700 10px system-ui,sans-serif}.documentation{font:12px system-ui,sans-serif;fill:#64748b}.relationship{fill:none;stroke:#334155;stroke-width:1.75}`,
    `</style>`,
    model.documentation === undefined
      ? ""
      : `<text class="document-title" x="${margin}" y="30">${escapeXml(model.documentation.split("\n")[0] ?? model.documentation)}</text>`,
    relationships,
    boxes.map(renderBox).join("\n"),
    `</svg>`,
    "",
  ].join("\n");
}

function layout(model: ValidatedDatabaseModel): Box[] {
  const foreignKeys = new Set(
    model.relationships.map(
      (relationship) =>
        `${relationship.source.table.name}.${relationship.source.column.name}`,
    ),
  );
  const tables: Box[] = [];
  let tableY =
    margin + (model.documentation === undefined ? 0 : documentHeaderHeight);
  for (let index = 0; index < model.tables.length; index += 2) {
    const left = tableBox(model.tables[index]!, 0, tableY, foreignKeys);
    const rightTable = model.tables[index + 1];
    const right =
      rightTable === undefined
        ? undefined
        : tableBox(rightTable, 1, tableY, foreignKeys);
    tables.push(left);
    if (right !== undefined) {
      tables.push(right);
    }
    tableY += Math.max(left.height, right?.height ?? 0) + rowGap;
  }
  const enumX = margin + boxWidth + columnGap;
  let enumY =
    model.tables.length === 0
      ? margin
      : Math.max(...tables.map((box) => box.y + box.height)) + rowGap;
  const enums = model.enums.map((enumeration, index) => {
    const box = enumBox(enumeration, index, enumX, enumY);
    enumY += box.height + rowGap;
    return box;
  });
  return [...tables, ...enums];
}

function tableBox(
  table: ValidatedTable,
  column: number,
  y: number,
  foreignKeys: ReadonlySet<string>,
): Box {
  const documentationHeight =
    table.documentation === undefined ? 0 : documentationLineHeight + 8;
  return {
    id: `table-${slug(table.name)}`,
    name: table.name,
    x: margin + column * (boxWidth + columnGap),
    y,
    width: boxWidth,
    height:
      headerHeight + documentationHeight + table.columns.length * rowHeight,
    headerHeight: headerHeight + documentationHeight,
    rowHeight,
    rows: table.columns.map((tableColumn) => {
      const properties =
        tableColumn.properties.length === 0
          ? ""
          : ` [${tableColumn.properties.join(", ")}]`;
      const key = tableColumn.properties.includes("pk")
        ? "PK"
        : foreignKeys.has(`${table.name}.${tableColumn.name}`)
          ? "FK"
          : undefined;
      return {
        text: `${tableColumn.name}: ${tableColumn.typeName}${properties}`,
        ...(key === undefined ? {} : { key }),
      };
    }),
    ...(table.documentation === undefined
      ? {}
      : { documentation: table.documentation }),
  };
}

function enumBox(
  enumeration: ValidatedEnum,
  index: number,
  x: number,
  y: number,
): Box {
  const documentationHeight =
    enumeration.documentation === undefined ? 0 : documentationLineHeight + 8;
  return {
    id: `enum-${index}-${slug(enumeration.name)}`,
    name: enumeration.name,
    x,
    y,
    width: boxWidth,
    height:
      headerHeight +
      documentationHeight +
      enumeration.members.length * rowHeight,
    headerHeight: headerHeight + documentationHeight,
    rowHeight,
    rows: enumeration.members.map((member) => ({ text: member })),
    ...(enumeration.documentation === undefined
      ? {}
      : { documentation: enumeration.documentation }),
  };
}

function renderBox(box: Box): string {
  const headerClass = box.id.startsWith("enum-") ? "enum-header" : "header";
  const documentation = box.documentation?.split("\n")[0];
  const rows = box.rows
    .map((row, index) => {
      const y = box.y + box.headerHeight + index * box.rowHeight;
      const rowClass =
        row.key === "PK"
          ? "row row-pk"
          : row.key === "FK"
            ? "row row-fk"
            : "row";
      return [
        `<line class="divider" x1="${box.x}" y1="${y}" x2="${box.x + box.width}" y2="${y}" />`,
        row.key === undefined
          ? ""
          : `<text class="key-badge ${rowClass}" x="${box.x + 12}" y="${y + 18}">${row.key}</text>`,
        `<text class="${rowClass}" x="${box.x + (row.key === undefined ? 12 : 38)}" y="${y + 19}">${escapeXml(row.text)}</text>`,
      ].join("");
    })
    .join("\n");
  return [
    `<g id="${box.id}">`,
    `<rect class="box" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="6" />`,
    `<path class="${headerClass}" d="M ${box.x + 6} ${box.y} H ${box.x + box.width - 6} Q ${box.x + box.width} ${box.y} ${box.x + box.width} ${box.y + 6} V ${box.y + box.headerHeight} H ${box.x} V ${box.y + 6} Q ${box.x} ${box.y} ${box.x + 6} ${box.y} Z" />`,
    `<text class="title" x="${box.x + 12}" y="${box.y + 24}">${escapeXml(box.name)}</text>`,
    documentation === undefined
      ? ""
      : `<text class="documentation" x="${box.x + 12}" y="${box.y + 45}">${escapeXml(documentation)}</text>`,
    rows,
    `</g>`,
  ].join("\n");
}

function slug(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "-");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
