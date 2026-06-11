import type {
  ColumnDeclaration,
  ColumnProperty,
  ColumnPropertyName,
  DatabaseDeclaration,
  Diagnostic,
  DiagramDeclaration,
  DocumentedNode,
  EnumDeclaration,
  EnumMember,
  Identifier,
  OrbitDocument,
  ParseResult,
  QualifiedReference,
  RecordField,
  RecordRow,
  RecordsDeclaration,
  RelationshipDeclaration,
  SourceRange,
  TableDeclaration,
} from "@orbit/core";
import { lex, type LexResult, type Token, type TokenKind } from "./lexer.js";

export interface ParseOptions {
  readonly fileName?: string;
}

interface Documentation {
  readonly text: string;
  readonly range: SourceRange;
  readonly token: Token;
}

const topLevelKeywords = new Set(["table", "enum", "relationship", "records"]);
const columnProperties = new Set<ColumnPropertyName>([
  "pk",
  "auto_increment",
  "unique",
  "not_null",
]);

class Parser {
  private readonly tokens: readonly Token[];
  private readonly diagnostics: Diagnostic[];
  private index = 0;

  public constructor(
    private readonly source: string,
    result: LexResult,
  ) {
    this.tokens = result.tokens;
    this.diagnostics = [...result.diagnostics];
  }

  public parse(): ParseResult {
    const documentStart = this.current().range.start;
    const documentation = this.takeDocumentation("diagram declaration");
    const diagram = this.parseDiagram(documentation);
    if (diagram === undefined) {
      return { diagnostics: this.diagnostics };
    }

    const declarations: DatabaseDeclaration[] = [];
    while (!this.at("eof")) {
      const doc = this.takeDocumentation("declaration");
      if (this.at("eof")) {
        if (doc !== undefined) {
          this.orphanDocumentation(doc);
        }
        break;
      }
      const declaration = this.parseTopLevel(doc);
      if (declaration !== undefined) {
        declarations.push(declaration);
      } else {
        this.recoverTopLevel();
      }
    }

    const ast: OrbitDocument = {
      kind: "OrbitDocument",
      range: { start: documentStart, end: this.current().range.end },
      diagram,
      declarations,
    };
    return { ast, diagnostics: this.diagnostics };
  }

  private parseDiagram(
    documentation?: Documentation,
  ): DiagramDeclaration | undefined {
    const start = documentation?.range.start ?? this.current().range.start;
    if (!this.consumeIdentifier("diagram")) {
      this.error(
        "ORB1101",
        "Every ORBIT document must begin with 'diagram database;'.",
      );
      return undefined;
    }
    const type = this.expect(
      "identifier",
      "ORB1102",
      "Expected a diagram type after 'diagram'.",
    );
    if (type === undefined) {
      return undefined;
    }
    if (type.text !== "database") {
      this.diagnostics.push({
        code: "ORB1103",
        severity: "error",
        message: `Unsupported diagram type '${type.text}'. Wave 1 supports only 'database'.`,
        range: type.range,
      });
    }
    const end = this.requireSemicolon("diagram declaration");
    return this.withDocumentation<DiagramDeclaration>(
      {
        kind: "DiagramDeclaration",
        diagramType: "database",
        range: { start, end: end.end },
      },
      documentation,
    );
  }

  private parseTopLevel(
    documentation?: Documentation,
  ): DatabaseDeclaration | undefined {
    const keyword = this.current();
    if (keyword.kind !== "identifier") {
      if (documentation !== undefined) {
        this.orphanDocumentation(documentation);
      }
      this.error("ORB1104", "Expected a database declaration.");
      return undefined;
    }
    switch (keyword.text) {
      case "table":
        return this.parseTable(documentation);
      case "enum":
        return this.parseEnum(documentation);
      case "relationship":
        return this.parseRelationship(documentation);
      case "records":
        return this.parseRecords(documentation);
      case "index":
      case "constraint":
        if (documentation !== undefined) {
          this.orphanDocumentation(documentation);
        }
        this.error(
          "ORB1105",
          `'${keyword.text}' is outside the Database MVP. Use column properties where applicable.`,
          keyword.range,
        );
        return undefined;
      case "ref":
        if (documentation !== undefined) {
          this.orphanDocumentation(documentation);
        }
        this.error(
          "ORB1106",
          "'ref' is obsolete. Use a named 'relationship' block.",
          keyword.range,
        );
        return undefined;
      default:
        if (documentation !== undefined) {
          this.orphanDocumentation(documentation);
        }
        this.error(
          "ORB1107",
          `Unknown database declaration '${keyword.text}'.`,
          keyword.range,
        );
        return undefined;
    }
  }

  private parseTable(
    documentation?: Documentation,
  ): TableDeclaration | undefined {
    const start = documentation?.range.start ?? this.advance().range.start;
    if (documentation !== undefined) {
      this.advance();
    }
    const name = this.parseIdentifier("table name");
    if (name === undefined || !this.consume("leftBrace")) {
      this.error("ORB1110", "Expected '{' after the table name.");
      return undefined;
    }
    const columns: ColumnDeclaration[] = [];
    while (!this.at("rightBrace") && !this.at("eof")) {
      const doc = this.takeDocumentation("column declaration");
      if (!this.consumeIdentifier("column")) {
        if (doc !== undefined) {
          this.orphanDocumentation(doc);
        }
        this.error("ORB1111", "Tables may contain only column declarations.");
        this.recoverBlock();
        continue;
      }
      const column = this.parseColumn(doc);
      if (column !== undefined) {
        columns.push(column);
      }
    }
    this.expect("rightBrace", "ORB1112", "Expected '}' to close the table.");
    const end = this.requireSemicolon("table block");
    return this.withDocumentation<TableDeclaration>(
      {
        kind: "TableDeclaration",
        name,
        columns,
        range: { start, end: end.end },
      },
      documentation,
    );
  }

  private parseColumn(
    documentation?: Documentation,
  ): ColumnDeclaration | undefined {
    const start = documentation?.range.start ?? this.previous().range.start;
    const name = this.parseIdentifier("column name");
    const typeName = this.parseIdentifier("column type");
    if (name === undefined || typeName === undefined) {
      return undefined;
    }
    const properties: ColumnProperty[] = [];
    if (this.consume("leftBrace")) {
      while (!this.at("rightBrace") && !this.at("eof")) {
        const token = this.expect(
          "identifier",
          "ORB1120",
          "Expected a column property.",
        );
        if (token === undefined) {
          this.recoverBlock();
          continue;
        }
        if (!columnProperties.has(token.text as ColumnPropertyName)) {
          this.error(
            "ORB1121",
            `Unknown column property '${token.text}'.`,
            token.range,
          );
        } else {
          properties.push({
            kind: "ColumnProperty",
            name: token.text as ColumnPropertyName,
            range: { start: token.range.start, end: token.range.end },
          });
        }
        this.requireSemicolon("column property");
      }
      this.expect(
        "rightBrace",
        "ORB1122",
        "Expected '}' to close the column block.",
      );
    }
    const end = this.requireSemicolon("column declaration");
    return this.withDocumentation<ColumnDeclaration>(
      {
        kind: "ColumnDeclaration",
        name,
        typeName,
        properties,
        range: { start, end: end.end },
      },
      documentation,
    );
  }

  private parseEnum(
    documentation?: Documentation,
  ): EnumDeclaration | undefined {
    const start = documentation?.range.start ?? this.advance().range.start;
    if (documentation !== undefined) {
      this.advance();
    }
    const name = this.parseIdentifier("enum name");
    if (name === undefined || !this.consume("leftBrace")) {
      this.error("ORB1130", "Expected '{' after the enum name.");
      return undefined;
    }
    const members: EnumMember[] = [];
    while (!this.at("rightBrace") && !this.at("eof")) {
      if (this.at("documentation")) {
        const doc = this.takeDocumentation("enum member");
        if (doc !== undefined) {
          this.orphanDocumentation(doc);
        }
      }
      const member = this.parseIdentifier("enum member");
      if (member === undefined) {
        this.recoverBlock();
        continue;
      }
      const end = this.requireSemicolon("enum member");
      members.push({
        kind: "EnumMember",
        name: member,
        range: { start: member.range.start, end: end.end },
      });
    }
    this.expect("rightBrace", "ORB1131", "Expected '}' to close the enum.");
    const end = this.requireSemicolon("enum block");
    return this.withDocumentation<EnumDeclaration>(
      {
        kind: "EnumDeclaration",
        name,
        members,
        range: { start, end: end.end },
      },
      documentation,
    );
  }

  private parseRelationship(
    documentation?: Documentation,
  ): RelationshipDeclaration | undefined {
    const start = documentation?.range.start ?? this.advance().range.start;
    if (documentation !== undefined) {
      this.advance();
    }
    const name = this.parseIdentifier("relationship name");
    if (name === undefined || !this.consume("leftBrace")) {
      this.error("ORB1140", "Expected '{' after the relationship name.");
      return undefined;
    }
    const source = this.parseQualifiedReference();
    this.expect(
      "arrow",
      "ORB1141",
      "Expected '->' between relationship endpoints.",
    );
    const target = this.parseQualifiedReference();
    this.requireSemicolon("relationship reference");
    this.expect(
      "rightBrace",
      "ORB1142",
      "Expected '}' to close the relationship.",
    );
    const end = this.requireSemicolon("relationship block");
    if (source === undefined || target === undefined) {
      return undefined;
    }
    return this.withDocumentation<RelationshipDeclaration>(
      {
        kind: "RelationshipDeclaration",
        name,
        source,
        target,
        range: { start, end: end.end },
      },
      documentation,
    );
  }

  private parseRecords(
    documentation?: Documentation,
  ): RecordsDeclaration | undefined {
    const start = documentation?.range.start ?? this.advance().range.start;
    if (documentation !== undefined) {
      this.advance();
    }
    const tableName = this.parseIdentifier("records table name");
    if (tableName === undefined || !this.consume("leftBrace")) {
      this.error("ORB1150", "Expected '{' after the records table name.");
      return undefined;
    }
    const rows: RecordRow[] = [];
    while (!this.at("rightBrace") && !this.at("eof")) {
      const row = this.parseRecordRow();
      if (row !== undefined) {
        rows.push(row);
      } else {
        this.recoverBlock();
      }
    }
    this.expect(
      "rightBrace",
      "ORB1151",
      "Expected '}' to close the records block.",
    );
    const end = this.requireSemicolon("records block");
    return this.withDocumentation<RecordsDeclaration>(
      {
        kind: "RecordsDeclaration",
        tableName,
        rows,
        range: { start, end: end.end },
      },
      documentation,
    );
  }

  private parseRecordRow(): RecordRow | undefined {
    const left = this.expect(
      "leftBrace",
      "ORB1160",
      "Expected '{' to start a record row.",
    );
    if (left === undefined) {
      return undefined;
    }
    const fields: RecordField[] = [];
    while (!this.at("rightBrace") && !this.at("eof")) {
      const name = this.parseIdentifier("record field name");
      this.expect(
        "colon",
        "ORB1161",
        "Expected ':' after the record field name.",
      );
      const valueToken = this.current();
      let value: RecordField["value"];
      let valueKind: RecordField["valueKind"];
      if (valueToken.kind === "string") {
        value = String(valueToken.value ?? "");
        valueKind = "string";
        this.advance();
      } else if (valueToken.kind === "number") {
        value = Number(valueToken.value);
        valueKind = "number";
        this.advance();
      } else if (valueToken.kind === "identifier") {
        if (valueToken.text === "true" || valueToken.text === "false") {
          value = valueToken.text === "true";
          valueKind = "boolean";
        } else if (valueToken.text === "null") {
          value = null;
          valueKind = "null";
        } else {
          value = valueToken.text;
          valueKind = "identifier";
        }
        this.advance();
      } else {
        this.error("ORB1162", "Expected a scalar record value.");
        return undefined;
      }
      if (name !== undefined) {
        fields.push({
          kind: "RecordField",
          name,
          value,
          valueKind,
          range: { start: name.range.start, end: valueToken.range.end },
        });
      }
      if (!this.consume("comma")) {
        break;
      }
    }
    const right = this.expect(
      "rightBrace",
      "ORB1163",
      "Expected '}' to close the record row.",
    );
    const end = this.requireSemicolon("record row");
    if (right === undefined) {
      return undefined;
    }
    return {
      kind: "RecordRow",
      fields,
      range: { start: left.range.start, end: end.end },
    };
  }

  private parseQualifiedReference(): QualifiedReference | undefined {
    const table = this.parseIdentifier("relationship table");
    this.expect("dot", "ORB1170", "Expected '.' in a relationship endpoint.");
    const column = this.parseIdentifier("relationship column");
    if (table === undefined || column === undefined) {
      return undefined;
    }
    return {
      kind: "QualifiedReference",
      table,
      column,
      range: { start: table.range.start, end: column.range.end },
    };
  }

  private parseIdentifier(description: string): Identifier | undefined {
    const token = this.expect(
      "identifier",
      "ORB1180",
      `Expected ${description}.`,
    );
    return token === undefined
      ? undefined
      : { kind: "Identifier", name: token.text, range: token.range };
  }

  private takeDocumentation(target: string): Documentation | undefined {
    if (!this.at("documentation")) {
      return undefined;
    }
    const token = this.advance();
    const next = this.current();
    const gap = this.source.slice(
      token.range.end.offset,
      next.range.start.offset,
    );
    const hasBlankLine = /\r?\n[ \t]*\r?\n/.test(gap);
    const hasComment = /\/\//.test(gap);
    if (hasBlankLine || hasComment || next.kind === "documentation") {
      const doc = this.documentationFrom(token);
      this.orphanDocumentation(
        doc,
        `Documentation must be immediately adjacent to its ${target}.`,
      );
      return this.takeDocumentation(target);
    }
    return this.documentationFrom(token);
  }

  private documentationFrom(token: Token): Documentation {
    return {
      text: normalizeDocumentation(String(token.value ?? "")),
      range: token.range,
      token,
    };
  }

  private orphanDocumentation(
    documentation: Documentation,
    message = "Documentation block does not document a supported declaration.",
  ): void {
    this.diagnostics.push({
      code: "ORB1190",
      severity: "error",
      message,
      range: documentation.range,
    });
  }

  private withDocumentation<T extends DocumentedNode>(
    node: T,
    documentation?: Documentation,
  ): T {
    if (documentation === undefined) {
      return node;
    }
    return {
      ...node,
      documentation: documentation.text,
      documentationRange: documentation.range,
    };
  }

  private requireSemicolon(context: string): SourceRange {
    const token = this.consumeToken("semicolon");
    if (token !== undefined) {
      return token.range;
    }
    this.error("ORB1191", `Expected ';' after ${context}.`);
    return this.previous().range;
  }

  private recoverTopLevel(): void {
    while (!this.at("eof")) {
      if (this.consume("semicolon")) {
        return;
      }
      if (
        this.current().kind === "identifier" &&
        topLevelKeywords.has(this.current().text)
      ) {
        return;
      }
      this.advance();
    }
  }

  private recoverBlock(): void {
    while (!this.at("eof") && !this.at("rightBrace")) {
      if (this.consume("semicolon")) {
        return;
      }
      this.advance();
    }
  }

  private consumeIdentifier(value: string): boolean {
    if (this.current().kind === "identifier" && this.current().text === value) {
      this.advance();
      return true;
    }
    return false;
  }

  private consume(kind: TokenKind): boolean {
    return this.consumeToken(kind) !== undefined;
  }

  private consumeToken(kind: TokenKind): Token | undefined {
    if (!this.at(kind)) {
      return undefined;
    }
    return this.advance();
  }

  private expect(
    kind: TokenKind,
    code: string,
    message: string,
  ): Token | undefined {
    const token = this.consumeToken(kind);
    if (token === undefined) {
      this.error(code, message);
    }
    return token;
  }

  private error(
    code: string,
    message: string,
    range = this.current().range,
  ): void {
    this.diagnostics.push({ code, severity: "error", message, range });
  }

  private at(kind: TokenKind): boolean {
    return this.current().kind === kind;
  }

  private current(): Token {
    return this.tokens[this.index] ?? this.tokens[this.tokens.length - 1]!;
  }

  private previous(): Token {
    return this.tokens[Math.max(0, this.index - 1)]!;
  }

  private advance(): Token {
    const token = this.current();
    if (token.kind !== "eof") {
      this.index += 1;
    }
    return token;
  }
}

function normalizeDocumentation(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  if (lines[0]?.trim() === "") {
    lines.shift();
  }
  if (lines.at(-1)?.trim() === "") {
    lines.pop();
  }
  const nonEmpty = lines.filter((line) => line.trim() !== "");
  const indentation =
    nonEmpty.length === 0
      ? 0
      : Math.min(
          ...nonEmpty.map((line) => line.match(/^[ \t]*/)?.[0].length ?? 0),
        );
  return lines.map((line) => line.slice(indentation)).join("\n");
}

export function parseOrbit(
  source: string,
  _options: ParseOptions = {},
): ParseResult {
  return new Parser(source, lex(source)).parse();
}
