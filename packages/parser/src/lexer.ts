import type { Diagnostic, SourcePosition, SourceRange } from "@orbit/core";

export type TokenKind =
  | "identifier"
  | "string"
  | "number"
  | "documentation"
  | "leftBrace"
  | "rightBrace"
  | "semicolon"
  | "dot"
  | "colon"
  | "comma"
  | "arrow"
  | "eof";

export interface Token {
  readonly kind: TokenKind;
  readonly text: string;
  readonly value?: string | number;
  readonly range: SourceRange;
}

export interface LexResult {
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly Diagnostic[];
}

const identifierStart = /[A-Za-z_]/;
const identifierPart = /[A-Za-z0-9_]/;

export function lex(source: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: Diagnostic[] = [];
  let offset = 0;
  let line = 1;
  let column = 1;

  const position = (): SourcePosition => ({ offset, line, column });
  const advance = (): string => {
    const character = source[offset] ?? "";
    offset += 1;
    if (character === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  };
  const rangeFrom = (start: SourcePosition): SourceRange => ({
    start,
    end: position(),
  });
  const push = (
    kind: TokenKind,
    start: SourcePosition,
    text: string,
    value?: string | number,
  ): void => {
    tokens.push(
      value === undefined
        ? { kind, text, range: rangeFrom(start) }
        : { kind, text, value, range: rangeFrom(start) },
    );
  };

  while (offset < source.length) {
    const character = source[offset] ?? "";

    if (/\s/.test(character)) {
      advance();
      continue;
    }

    if (source.startsWith("//", offset)) {
      while (offset < source.length && source[offset] !== "\n") {
        advance();
      }
      continue;
    }

    const start = position();

    if (source.startsWith('"""', offset)) {
      advance();
      advance();
      advance();
      const contentStart = offset;
      while (offset < source.length && !source.startsWith('"""', offset)) {
        advance();
      }
      if (offset >= source.length) {
        diagnostics.push({
          code: "ORB1001",
          severity: "error",
          message: "Unterminated documentation block.",
          range: rangeFrom(start),
        });
        push(
          "documentation",
          start,
          source.slice(start.offset),
          source.slice(contentStart),
        );
        break;
      }
      const value = source.slice(contentStart, offset);
      advance();
      advance();
      advance();
      push("documentation", start, source.slice(start.offset, offset), value);
      continue;
    }

    if (character === '"') {
      advance();
      let value = "";
      let terminated = false;
      while (offset < source.length) {
        const current = advance();
        if (current === '"') {
          terminated = true;
          break;
        }
        if (current === "\\") {
          const escaped = advance();
          const escapes: Record<string, string> = {
            '"': '"',
            "\\": "\\",
            n: "\n",
            r: "\r",
            t: "\t",
          };
          value += escapes[escaped] ?? escaped;
        } else {
          value += current;
        }
      }
      if (!terminated) {
        diagnostics.push({
          code: "ORB1002",
          severity: "error",
          message: "Unterminated string literal.",
          range: rangeFrom(start),
        });
      }
      push("string", start, source.slice(start.offset, offset), value);
      continue;
    }

    if (identifierStart.test(character)) {
      advance();
      while (identifierPart.test(source[offset] ?? "")) {
        advance();
      }
      const text = source.slice(start.offset, offset);
      push("identifier", start, text, text);
      continue;
    }

    if (
      /[0-9-]/.test(character) &&
      /[0-9]/.test(character === "-" ? (source[offset + 1] ?? "") : character)
    ) {
      if (character === "-") {
        advance();
      }
      while (/[0-9]/.test(source[offset] ?? "")) {
        advance();
      }
      if (source[offset] === "." && /[0-9]/.test(source[offset + 1] ?? "")) {
        advance();
        while (/[0-9]/.test(source[offset] ?? "")) {
          advance();
        }
      }
      const text = source.slice(start.offset, offset);
      push("number", start, text, Number(text));
      continue;
    }

    const simpleTokens: Record<string, TokenKind> = {
      "{": "leftBrace",
      "}": "rightBrace",
      ";": "semicolon",
      ".": "dot",
      ":": "colon",
      ",": "comma",
    };
    const simpleKind = simpleTokens[character];
    if (simpleKind !== undefined) {
      advance();
      push(simpleKind, start, character);
      continue;
    }

    if (source.startsWith("->", offset)) {
      advance();
      advance();
      push("arrow", start, "->");
      continue;
    }

    advance();
    diagnostics.push({
      code: "ORB1003",
      severity: "error",
      message: `Unexpected character '${character}'.`,
      range: rangeFrom(start),
    });
  }

  const eof = position();
  tokens.push({ kind: "eof", text: "", range: { start: eof, end: eof } });
  return { tokens, diagnostics };
}
