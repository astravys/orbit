import type {
  ColumnDeclaration,
  Diagnostic,
  EnumDeclaration,
  OrbitDocument,
  RecordField,
  RecordsDeclaration,
  RelationshipDeclaration,
  SourceRange,
  TableDeclaration,
  ValidatedColumn,
  ValidatedDatabaseModel,
  ValidatedEnum,
  ValidatedRecordRow,
  ValidatedRecords,
  ValidatedRelationship,
  ValidatedTable,
  ValidationResult,
} from "@orbit/core";

const primitiveKinds = new Map<string, "string" | "number" | "boolean">([
  ["string", "string"],
  ["text", "string"],
  ["varchar", "string"],
  ["date", "string"],
  ["timestamp", "string"],
  ["int", "number"],
  ["integer", "number"],
  ["float", "number"],
  ["double", "number"],
  ["decimal", "number"],
  ["number", "number"],
  ["bool", "boolean"],
  ["boolean", "boolean"],
]);

export function validateDatabase(document: OrbitDocument): ValidationResult {
  const diagnostics: Diagnostic[] = [];
  const tableDeclarations = document.declarations.filter(
    (declaration): declaration is TableDeclaration =>
      declaration.kind === "TableDeclaration",
  );
  const enumDeclarations = document.declarations.filter(
    (declaration): declaration is EnumDeclaration =>
      declaration.kind === "EnumDeclaration",
  );
  const relationshipDeclarations = document.declarations.filter(
    (declaration): declaration is RelationshipDeclaration =>
      declaration.kind === "RelationshipDeclaration",
  );
  const recordsDeclarations = document.declarations.filter(
    (declaration): declaration is RecordsDeclaration =>
      declaration.kind === "RecordsDeclaration",
  );

  detectNamedDuplicates(tableDeclarations, "table", diagnostics);
  detectNamedDuplicates(enumDeclarations, "enum", diagnostics);
  detectNamedDuplicates(relationshipDeclarations, "relationship", diagnostics);

  const enumSymbols = new Map<string, EnumDeclaration>();
  for (const declaration of enumDeclarations) {
    if (!enumSymbols.has(declaration.name.name)) {
      enumSymbols.set(declaration.name.name, declaration);
    }
    detectMemberDuplicates(declaration, diagnostics);
  }

  const typeNames = new Map<string, SourceRange>();
  for (const declaration of [...tableDeclarations, ...enumDeclarations]) {
    const previous = typeNames.get(declaration.name.name);
    if (previous !== undefined) {
      diagnostics.push({
        code: "ORB2004",
        severity: "error",
        message: `Type name '${declaration.name.name}' is already declared.`,
        range: declaration.name.range,
        related: [{ message: "First declaration is here.", range: previous }],
      });
    } else {
      typeNames.set(declaration.name.name, declaration.name.range);
    }
  }

  const tables: ValidatedTable[] = [];
  const tableSymbols = new Map<string, ValidatedTable>();
  for (const declaration of tableDeclarations) {
    const table = validateTable(declaration, enumSymbols, diagnostics);
    tables.push(table);
    if (!tableSymbols.has(table.name)) {
      tableSymbols.set(table.name, table);
    }
  }

  const enums: ValidatedEnum[] = enumDeclarations.map((declaration) => ({
    name: declaration.name.name,
    members: declaration.members.map((member) => member.name.name),
    range: declaration.range,
    ...(declaration.documentation === undefined
      ? {}
      : { documentation: declaration.documentation }),
  }));

  const relationships: ValidatedRelationship[] = [];
  for (const declaration of relationshipDeclarations) {
    const relationship = validateRelationship(
      declaration,
      tableSymbols,
      diagnostics,
    );
    if (relationship !== undefined) {
      relationships.push(relationship);
    }
  }

  const records: ValidatedRecords[] = [];
  for (const declaration of recordsDeclarations) {
    const validated = validateRecords(
      declaration,
      tableSymbols,
      enumSymbols,
      diagnostics,
    );
    if (validated !== undefined) {
      records.push(validated);
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return { diagnostics };
  }

  const model: ValidatedDatabaseModel = {
    kind: "ValidatedDatabaseModel",
    tables,
    enums,
    relationships,
    records,
    ...(document.diagram.documentation === undefined
      ? {}
      : { documentation: document.diagram.documentation }),
  };
  return { model, diagnostics };
}

function validateTable(
  declaration: TableDeclaration,
  enumSymbols: ReadonlyMap<string, EnumDeclaration>,
  diagnostics: Diagnostic[],
): ValidatedTable {
  detectNamedDuplicates(declaration.columns, "column", diagnostics);
  const columns = declaration.columns.map((column) =>
    validateColumn(column, enumSymbols, diagnostics),
  );
  return {
    name: declaration.name.name,
    columns,
    range: declaration.range,
    ...(declaration.documentation === undefined
      ? {}
      : { documentation: declaration.documentation }),
  };
}

function validateColumn(
  declaration: ColumnDeclaration,
  enumSymbols: ReadonlyMap<string, EnumDeclaration>,
  diagnostics: Diagnostic[],
): ValidatedColumn {
  const properties = new Set<string>();
  for (const property of declaration.properties) {
    if (properties.has(property.name)) {
      diagnostics.push({
        code: "ORB2010",
        severity: "error",
        message: `Column property '${property.name}' is duplicated.`,
        range: property.range,
      });
    }
    properties.add(property.name);
  }
  if (properties.has("auto_increment") && !properties.has("pk")) {
    diagnostics.push({
      code: "ORB2011",
      severity: "warning",
      message: "'auto_increment' is usually paired with 'pk'.",
      range: declaration.range,
    });
  }
  const typeName = declaration.typeName.name;
  const typeKind = enumSymbols.has(typeName)
    ? "enum"
    : primitiveKinds.has(typeName)
      ? "primitive"
      : "opaque";
  return {
    name: declaration.name.name,
    typeName,
    typeKind,
    properties: declaration.properties.map((property) => property.name),
    range: declaration.range,
    ...(declaration.documentation === undefined
      ? {}
      : { documentation: declaration.documentation }),
  };
}

function validateRelationship(
  declaration: RelationshipDeclaration,
  tables: ReadonlyMap<string, ValidatedTable>,
  diagnostics: Diagnostic[],
): ValidatedRelationship | undefined {
  const source = resolveEndpoint(
    declaration.source.table.name,
    declaration.source.column.name,
    declaration.source.range,
    tables,
    diagnostics,
  );
  const target = resolveEndpoint(
    declaration.target.table.name,
    declaration.target.column.name,
    declaration.target.range,
    tables,
    diagnostics,
  );
  if (source === undefined || target === undefined) {
    return undefined;
  }
  return {
    name: declaration.name.name,
    source,
    target,
    range: declaration.range,
    ...(declaration.documentation === undefined
      ? {}
      : { documentation: declaration.documentation }),
  };
}

function resolveEndpoint(
  tableName: string,
  columnName: string,
  range: SourceRange,
  tables: ReadonlyMap<string, ValidatedTable>,
  diagnostics: Diagnostic[],
) {
  const table = tables.get(tableName);
  if (table === undefined) {
    diagnostics.push({
      code: "ORB2020",
      severity: "error",
      message: `Relationship references unknown table '${tableName}'.`,
      range,
    });
    return undefined;
  }
  const column = table.columns.find(
    (candidate) => candidate.name === columnName,
  );
  if (column === undefined) {
    diagnostics.push({
      code: "ORB2021",
      severity: "error",
      message: `Relationship references unknown column '${tableName}.${columnName}'.`,
      range,
    });
    return undefined;
  }
  return { table, column };
}

function validateRecords(
  declaration: RecordsDeclaration,
  tables: ReadonlyMap<string, ValidatedTable>,
  enums: ReadonlyMap<string, EnumDeclaration>,
  diagnostics: Diagnostic[],
): ValidatedRecords | undefined {
  const table = tables.get(declaration.tableName.name);
  if (table === undefined) {
    diagnostics.push({
      code: "ORB2030",
      severity: "error",
      message: `Records target unknown table '${declaration.tableName.name}'.`,
      range: declaration.tableName.range,
    });
    return undefined;
  }
  const rows: ValidatedRecordRow[] = declaration.rows.map((row) => {
    const fields = new Map<string, RecordField>();
    for (const field of row.fields) {
      const previous = fields.get(field.name.name);
      if (previous !== undefined) {
        diagnostics.push({
          code: "ORB2031",
          severity: "error",
          message: `Record field '${field.name.name}' is duplicated.`,
          range: field.name.range,
          related: [
            { message: "First field is here.", range: previous.name.range },
          ],
        });
      } else {
        fields.set(field.name.name, field);
      }
      const column = table.columns.find(
        (candidate) => candidate.name === field.name.name,
      );
      if (column === undefined) {
        diagnostics.push({
          code: "ORB2032",
          severity: "error",
          message: `Record references unknown column '${table.name}.${field.name.name}'.`,
          range: field.name.range,
        });
        continue;
      }
      validateRecordValue(field, column, enums, diagnostics);
    }
    for (const column of table.columns) {
      if (column.properties.includes("not_null") && !fields.has(column.name)) {
        diagnostics.push({
          code: "ORB2033",
          severity: "error",
          message: `Record is missing required column '${table.name}.${column.name}'.`,
          range: row.range,
        });
      }
    }
    return {
      fields: row.fields.map((field) => ({
        name: field.name.name,
        value: field.value,
      })),
    };
  });
  return {
    table,
    rows,
    range: declaration.range,
    ...(declaration.documentation === undefined
      ? {}
      : { documentation: declaration.documentation }),
  };
}

function validateRecordValue(
  field: RecordField,
  column: ValidatedColumn,
  enums: ReadonlyMap<string, EnumDeclaration>,
  diagnostics: Diagnostic[],
): void {
  if (field.value === null) {
    if (column.properties.includes("not_null")) {
      diagnostics.push({
        code: "ORB2040",
        severity: "error",
        message: `Column '${column.name}' does not allow null record values.`,
        range: field.range,
      });
    }
    return;
  }
  if (column.typeKind === "enum") {
    const declaration = enums.get(column.typeName);
    const allowed = declaration?.members.some(
      (member) => member.name.name === field.value,
    );
    if (!allowed) {
      diagnostics.push({
        code: "ORB2041",
        severity: "error",
        message: `Value '${String(field.value)}' is not a member of enum '${column.typeName}'.`,
        range: field.range,
      });
    }
    return;
  }
  const expected = primitiveKinds.get(column.typeName);
  if (expected !== undefined && typeof field.value !== expected) {
    diagnostics.push({
      code: "ORB2042",
      severity: "error",
      message: `Column '${column.name}' expects a ${expected} record value.`,
      range: field.range,
    });
  }
}

function detectNamedDuplicates<
  T extends {
    readonly name: { readonly name: string; readonly range: SourceRange };
  },
>(declarations: readonly T[], label: string, diagnostics: Diagnostic[]): void {
  const seen = new Map<string, SourceRange>();
  for (const declaration of declarations) {
    const previous = seen.get(declaration.name.name);
    if (previous !== undefined) {
      diagnostics.push({
        code: "ORB2001",
        severity: "error",
        message: `Duplicate ${label} '${declaration.name.name}'.`,
        range: declaration.name.range,
        related: [{ message: `First ${label} is here.`, range: previous }],
      });
    } else {
      seen.set(declaration.name.name, declaration.name.range);
    }
  }
}

function detectMemberDuplicates(
  declaration: EnumDeclaration,
  diagnostics: Diagnostic[],
): void {
  const seen = new Map<string, SourceRange>();
  for (const member of declaration.members) {
    const previous = seen.get(member.name.name);
    if (previous !== undefined) {
      diagnostics.push({
        code: "ORB2002",
        severity: "error",
        message: `Duplicate enum member '${member.name.name}'.`,
        range: member.name.range,
        related: [{ message: "First member is here.", range: previous }],
      });
    } else {
      seen.set(member.name.name, member.name.range);
    }
  }
}
