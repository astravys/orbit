import type { Diagnostic, SourceRange } from "./source.js";

export interface AstNode {
  readonly kind: string;
  readonly range: SourceRange;
}

export interface DocumentedNode extends AstNode {
  readonly documentation?: string;
  readonly documentationRange?: SourceRange;
}

export interface DiagramDeclaration extends DocumentedNode {
  readonly kind: "DiagramDeclaration";
  readonly diagramType: "database";
}

export interface Identifier extends AstNode {
  readonly kind: "Identifier";
  readonly name: string;
}

export type ColumnPropertyName =
  | "pk"
  | "auto_increment"
  | "unique"
  | "not_null";

export interface ColumnProperty extends AstNode {
  readonly kind: "ColumnProperty";
  readonly name: ColumnPropertyName;
}

export interface ColumnDeclaration extends DocumentedNode {
  readonly kind: "ColumnDeclaration";
  readonly name: Identifier;
  readonly typeName: Identifier;
  readonly properties: readonly ColumnProperty[];
}

export interface TableDeclaration extends DocumentedNode {
  readonly kind: "TableDeclaration";
  readonly name: Identifier;
  readonly columns: readonly ColumnDeclaration[];
}

export interface EnumMember extends AstNode {
  readonly kind: "EnumMember";
  readonly name: Identifier;
}

export interface EnumDeclaration extends DocumentedNode {
  readonly kind: "EnumDeclaration";
  readonly name: Identifier;
  readonly members: readonly EnumMember[];
}

export interface QualifiedReference extends AstNode {
  readonly kind: "QualifiedReference";
  readonly table: Identifier;
  readonly column: Identifier;
}

export interface RelationshipDeclaration extends DocumentedNode {
  readonly kind: "RelationshipDeclaration";
  readonly name: Identifier;
  readonly source: QualifiedReference;
  readonly target: QualifiedReference;
}

export type RecordScalar = string | number | boolean | null;

export interface RecordField extends AstNode {
  readonly kind: "RecordField";
  readonly name: Identifier;
  readonly value: RecordScalar;
  readonly valueKind: "string" | "number" | "boolean" | "null" | "identifier";
}

export interface RecordRow extends AstNode {
  readonly kind: "RecordRow";
  readonly fields: readonly RecordField[];
}

export interface RecordsDeclaration extends DocumentedNode {
  readonly kind: "RecordsDeclaration";
  readonly tableName: Identifier;
  readonly rows: readonly RecordRow[];
}

export type DatabaseDeclaration =
  | TableDeclaration
  | EnumDeclaration
  | RelationshipDeclaration
  | RecordsDeclaration;

export interface OrbitDocument extends AstNode {
  readonly kind: "OrbitDocument";
  readonly diagram: DiagramDeclaration;
  readonly declarations: readonly DatabaseDeclaration[];
}

export interface ParseResult {
  readonly ast?: OrbitDocument;
  readonly diagnostics: readonly Diagnostic[];
}
