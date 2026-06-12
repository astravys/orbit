import type {
  ValidatedColumn,
  ValidatedDatabaseModel,
  ValidatedEnum,
  ValidatedRelationship,
  ValidatedTable,
} from "@orbit/core";
import type {
  GraphBadge,
  GraphEdge,
  GraphModel,
  GraphNode,
  GraphPort,
  GraphPortSide,
  GraphRow,
} from "@orbit/family-graph";

const badgeDefinitions = {
  pk: { label: "PK", kind: "database.column.pk" },
  unique: { label: "UQ", kind: "database.column.unique" },
  not_null: { label: "NN", kind: "database.column.not-null" },
  auto_increment: {
    label: "AI",
    kind: "database.column.auto-increment",
  },
} as const;

export function databaseToGraphModel(
  model: ValidatedDatabaseModel,
): GraphModel {
  const sourceColumns = new Set(
    model.relationships.map((relationship) =>
      columnKey(
        relationship.source.table.name,
        relationship.source.column.name,
      ),
    ),
  );
  const targetColumns = new Set(
    model.relationships.map((relationship) =>
      columnKey(
        relationship.target.table.name,
        relationship.target.column.name,
      ),
    ),
  );

  return {
    kind: "GraphModel",
    title: documentationTitle(model.documentation),
    nodes: [
      ...model.tables.map((table) =>
        tableToGraphNode(table, sourceColumns, targetColumns),
      ),
      ...model.enums.map(enumToGraphNode),
    ],
    edges: model.relationships.map(relationshipToGraphEdge),
    metadata: { domain: "database" },
    ...(model.documentation === undefined
      ? {}
      : { documentation: model.documentation }),
  };
}

function tableToGraphNode(
  table: ValidatedTable,
  sourceColumns: ReadonlySet<string>,
  targetColumns: ReadonlySet<string>,
): GraphNode {
  const rows = table.columns.map((column) =>
    columnToGraphRow(table.name, column, sourceColumns),
  );
  const ports = table.columns.map((column) =>
    columnToGraphPort(table.name, column, sourceColumns, targetColumns),
  );

  return {
    id: tableNodeId(table.name),
    kind: "database.table",
    title: table.name,
    compartments: [{ id: "columns", title: "Columns", rows }],
    ports,
    metadata: { tableName: table.name },
    ...(table.documentation === undefined
      ? {}
      : { documentation: table.documentation }),
  };
}

function columnToGraphRow(
  tableName: string,
  column: ValidatedColumn,
  sourceColumns: ReadonlySet<string>,
): GraphRow {
  const badges = columnBadges(
    column,
    sourceColumns.has(columnKey(tableName, column.name)),
  );

  return {
    id: columnRowId(tableName, column.name),
    label: `${column.name}: ${column.typeName}`,
    portId: columnPortId(tableName, column.name),
    metadata: {
      columnName: column.name,
      typeName: column.typeName,
      typeKind: column.typeKind,
      properties: column.properties,
    },
    ...(badges.length === 0 ? {} : { badges }),
  };
}

function columnToGraphPort(
  tableName: string,
  column: ValidatedColumn,
  sourceColumns: ReadonlySet<string>,
  targetColumns: ReadonlySet<string>,
): GraphPort {
  const key = columnKey(tableName, column.name);
  const preferredSide = portSide(
    sourceColumns.has(key),
    targetColumns.has(key),
  );

  return {
    id: columnPortId(tableName, column.name),
    rowId: columnRowId(tableName, column.name),
    metadata: { columnName: column.name },
    ...(preferredSide === undefined ? {} : { preferredSide }),
  };
}

function columnBadges(
  column: ValidatedColumn,
  isRelationshipSource: boolean,
): readonly GraphBadge[] {
  const properties = new Set(column.properties);
  const badges: GraphBadge[] = [];

  if (properties.has("pk")) {
    badges.push(badgeDefinitions.pk);
  }
  if (isRelationshipSource) {
    badges.push({ label: "FK", kind: "database.column.foreign-key" });
  }
  if (properties.has("unique")) {
    badges.push(badgeDefinitions.unique);
  }
  if (properties.has("not_null")) {
    badges.push(badgeDefinitions.not_null);
  }
  if (properties.has("auto_increment")) {
    badges.push(badgeDefinitions.auto_increment);
  }

  return badges;
}

function portSide(
  isRelationshipSource: boolean,
  isRelationshipTarget: boolean,
): GraphPortSide | undefined {
  // Source wins when a column is both source and target so the result is stable.
  if (isRelationshipSource) {
    return "right";
  }
  if (isRelationshipTarget) {
    return "left";
  }
  return undefined;
}

function enumToGraphNode(databaseEnum: ValidatedEnum): GraphNode {
  return {
    id: enumNodeId(databaseEnum.name),
    kind: "database.enum",
    title: databaseEnum.name,
    compartments: [
      {
        id: "members",
        title: "Members",
        rows: databaseEnum.members.map((member) => ({
          id: enumMemberRowId(databaseEnum.name, member),
          label: member,
        })),
      },
    ],
    metadata: { enumName: databaseEnum.name },
    ...(databaseEnum.documentation === undefined
      ? {}
      : { documentation: databaseEnum.documentation }),
  };
}

function relationshipToGraphEdge(
  relationship: ValidatedRelationship,
): GraphEdge {
  const sourceTable = relationship.source.table.name;
  const sourceColumn = relationship.source.column.name;
  const targetTable = relationship.target.table.name;
  const targetColumn = relationship.target.column.name;

  return {
    id: relationshipEdgeId(relationship.name),
    kind: "database.relationship",
    source: {
      nodeId: tableNodeId(sourceTable),
      rowId: columnRowId(sourceTable, sourceColumn),
      portId: columnPortId(sourceTable, sourceColumn),
    },
    target: {
      nodeId: tableNodeId(targetTable),
      rowId: columnRowId(targetTable, targetColumn),
      portId: columnPortId(targetTable, targetColumn),
    },
    label: relationship.name,
    direction: "directed",
    metadata: { relationshipName: relationship.name },
    ...(relationship.documentation === undefined
      ? {}
      : { documentation: relationship.documentation }),
  };
}

function documentationTitle(documentation: string | undefined): string {
  const firstLine = documentation?.split(/\r?\n/, 1)[0]?.trim();
  return firstLine === undefined || firstLine.length === 0
    ? "Database Schema"
    : firstLine;
}

function columnKey(tableName: string, columnName: string): string {
  return `${tableName}.${columnName}`;
}

function tableNodeId(name: string): string {
  return `table:${name}`;
}

function enumNodeId(name: string): string {
  return `enum:${name}`;
}

function columnRowId(tableName: string, columnName: string): string {
  return `column:${tableName}.${columnName}`;
}

function columnPortId(tableName: string, columnName: string): string {
  return `port:${tableName}.${columnName}`;
}

function enumMemberRowId(enumName: string, memberName: string): string {
  return `enum-member:${enumName}.${memberName}`;
}

function relationshipEdgeId(name: string): string {
  return `relationship:${name}`;
}
