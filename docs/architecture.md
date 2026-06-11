# ORBIT Architecture

Wave 1 implements a one-way pipeline:

```text
ORBIT source
  -> @orbit/parser
  -> @orbit/core AST
  -> @orbit/validator
  -> @orbit/core validated database model
  -> @orbit/renderer-svg
```

Applications orchestrate this pipeline but do not own language semantics.

## Package boundaries

- `@orbit/core` defines source locations, diagnostics, syntax trees, and validated model contracts.
- `@orbit/parser` owns lexical and syntactic analysis. It depends only on core.
- `@orbit/validator` owns symbols and semantic rules. It depends only on core.
- `@orbit/renderer-svg` accepts validated models and has no parser or validator dependency.
- `@orbit/cli` and `@orbit/playground` compose the public package APIs.

The Database MVP supports only tables, columns, enums, directed relationships, and
records. Every statement is semicolon-terminated. Comments are discarded, while
immediately adjacent documentation blocks are retained.
