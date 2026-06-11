# ORBIT

**ORBIT Builds Interconnected Topologies**

Current version: [`v0.1.0-alpha.1`](https://github.com/lunarmolly/orbit-language/tree/v0.1.0-alpha.1)

ORBIT is a human- and AI-friendly declarative language for describing structures, relationships, processes, timelines, and visual models.

The language is designed to be:

- Declarative
- Deterministic
- Extensible
- Machine-readable
- Human-readable

ORBIT aims to provide a unified way to describe databases, architectures, class models, workflows, pipelines, roadmaps, business models, and other structured representations through a single ecosystem of domain-specific diagram grammars.

```orbit
"""
Customer management database.
"""
diagram database;

table users {
  column id int {
    pk;
    auto_increment;
  };

  column name string;
};
```

## Goals

- One language, multiple diagram domains
- Strong validation and error diagnostics
- AI-friendly syntax and generation
- Automatic layout and rendering
- Portable, text-based model definitions

## Wave 1

The first implementation wave supports Database Schema models with:

- `table`
- `column`
- `enum`
- `relationship`
- `records`

Every statement, including a block statement, ends with `;`.

The current SVG renderer demonstrates the complete language pipeline but still
needs visual polish. See [Wave 1 rendering notes](docs/rendering-notes.md).

Pre-1.0 releases may change language syntax and public APIs. The first stable
Wave 1 milestone will be `v0.1.0`; `v1.0.0` is reserved for a stable language
specification and public API.

## Development

```sh
corepack enable
pnpm install
pnpm check
pnpm orbit validate docs/examples/customer-database.orbit
pnpm orbit render docs/examples/customer-database.orbit --output schema.svg
pnpm --filter @orbit/playground dev
```
