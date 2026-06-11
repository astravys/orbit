# Wave 1 Rendering Notes

Current version: `v0.1.0-alpha.1`

Wave 1 SVG rendering is functional but visually rough. The current output proves
that the complete ORBIT pipeline works:

```text
source -> lexer -> AST -> validator -> validated model -> SVG
```

The renderer is not intended to represent final visual quality yet. Known
limitations include:

- Relationship arrow visibility needs improvement.
- Relationship routing and layout need better collision avoidance and placement.
- Primary-key and foreign-key columns need clearer visual distinction.
- Layout, spacing, typography, and table/relationship styling need further polish.

These are presentation limitations. They do not change the Wave 1 language,
parser, validator, or validated model behavior.

ORBIT follows Semantic Versioning. Pre-1.0 releases may change language syntax
and public APIs. Future prerelease fixes will use versions such as
`v0.1.0-alpha.2`; the first stable Wave 1 MVP will be `v0.1.0`. Version `v1.0.0`
is reserved for a stable language specification and public API.
