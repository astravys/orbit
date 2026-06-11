# ORBIT

**ORBIT Builds Interconnected Topologies**

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

## Development

```sh
corepack enable
pnpm install
pnpm check
pnpm orbit validate docs/examples/customer-database.orbit
pnpm orbit render docs/examples/customer-database.orbit --output schema.svg
pnpm --filter @orbit/playground dev
```
