import type { ColumnPropertyName, RecordScalar } from "./ast.js";
import type { Diagnostic, SourceRange } from "./source.js";

export interface ValidatedColumn {
  readonly name: string;
  readonly typeName: string;
  readonly typeKind: "enum" | "primitive" | "opaque";
  readonly properties: readonly ColumnPropertyName[];
  readonly documentation?: string;
  readonly range: SourceRange;
}

export interface ValidatedTable {
  readonly name: string;
  readonly columns: readonly ValidatedColumn[];
  readonly documentation?: string;
  readonly range: SourceRange;
}

export interface ValidatedEnum {
  readonly name: string;
  readonly members: readonly string[];
  readonly documentation?: string;
  readonly range: SourceRange;
}

export interface ResolvedEndpoint {
  readonly table: ValidatedTable;
  readonly column: ValidatedColumn;
}

export interface ValidatedRelationship {
  readonly name: string;
  readonly source: ResolvedEndpoint;
  readonly target: ResolvedEndpoint;
  readonly documentation?: string;
  readonly range: SourceRange;
}

export interface ValidatedRecordField {
  readonly name: string;
  readonly value: RecordScalar;
}

export interface ValidatedRecordRow {
  readonly fields: readonly ValidatedRecordField[];
}

export interface ValidatedRecords {
  readonly table: ValidatedTable;
  readonly rows: readonly ValidatedRecordRow[];
  readonly documentation?: string;
  readonly range: SourceRange;
}

export interface ValidatedDatabaseModel {
  readonly kind: "ValidatedDatabaseModel";
  readonly documentation?: string;
  readonly tables: readonly ValidatedTable[];
  readonly enums: readonly ValidatedEnum[];
  readonly relationships: readonly ValidatedRelationship[];
  readonly records: readonly ValidatedRecords[];
}

export interface ValidationResult {
  readonly model?: ValidatedDatabaseModel;
  readonly diagnostics: readonly Diagnostic[];
}
