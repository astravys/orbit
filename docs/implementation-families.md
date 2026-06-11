# Diagram Implementation Families

ORBIT diagram types remain user-facing, domain-specific concepts. Internally,
they should reuse a smaller set of implementation families based on semantic
shape, grammar patterns, layout, routing, and renderer primitives.

The intended pipeline is:

```text
domain AST
  -> validated domain model
  -> family render model
  -> family layout and routing
  -> positioned renderer primitives
  -> SVG
```

Implementation families are not language syntax and do not weaken domain-specific
grammars. They are an internal reuse boundary.

## Families

- **Graph**: typed nodes, compartments, containment, and general edges.
- **Flow**: directed steps, branches, lanes, transitions, and ordered flow.
- **Timeline**: ordered time axes, tracks, intervals, milestones, and messages.
- **Matrix**: fixed or derived row/column grids and cells.
- **Canvas**: named regions containing structured text or cards.
- **Board/List**: ordered lanes, columns, groups, cards, and checklist items.

Families may define specialized subtypes. Likely Graph subtypes include Generic
Graph, Topology Graph, Hierarchy Graph, and Mapping Graph.

## Proposed Classification

| Diagram Type | User Group | Family | Grammar Similarity | Layout Similarity | Routing Similarity | Shared Primitives |
| --- | --- | --- | --- | --- | --- | --- |
| Database Schema | Engineering | Graph | entities, fields, directed references | compartment nodes | port-to-port edges | boxes, rows, badges, edges |
| ER Diagram | Engineering | Graph | entities, attributes, relationships | entity graph | cardinality edges | boxes, rows, edge labels |
| Domain Model | Engineering | Graph | entities, values, associations | typed graph | association edges | boxes, compartments, edges |
| Class Diagram | Engineering | Graph | classes, members, inheritance | compartment graph | typed edges | boxes, rows, arrows |
| Component Diagram | Engineering | Graph | components, ports, dependencies | clustered graph | dependency edges | groups, boxes, ports, edges |
| Architecture Diagram | Engineering | Graph | systems, services, dependencies | clustered graph | dependency edges | groups, boxes, icons, edges |
| C4 Diagram | Engineering | Graph | hierarchical elements and relations | nested/clustered graph | relationship edges | groups, boxes, labels, edges |
| Deployment Diagram | Engineering | Graph | nodes, artifacts, deployments | nested topology | topology edges | groups, boxes, badges, edges |
| Network Diagram | Engineering | Graph | devices, networks, links | topology graph | link routing | nodes, icons, labels, edges |
| Sequence Diagram | Engineering | Timeline | participants and messages | horizontal participants, vertical time | message arrows | lifelines, messages, activations |
| State Machine Diagram | Engineering | Flow | states, transitions, guards | directed state graph | transition routing | state nodes, edges, labels |
| Flowchart | Process | Flow | steps, decisions, transitions | layered directed graph | flow routing | process nodes, decisions, arrows |
| Activity Diagram | Process | Flow | activities, branches, joins, lanes | layered lanes | control-flow routing | lanes, nodes, forks, arrows |
| BPMN | Process | Flow | events, tasks, gateways, pools | layered pools/lanes | sequence/message routing | events, tasks, gateways, lanes |
| Pipeline | Process | Flow | stages, jobs, dependencies | layered stages | dependency routing | stages, nodes, status badges, arrows |
| Data Flow | Process | Flow | processes, stores, external actors | directed flow graph | labeled data-flow routing | nodes, stores, labels, arrows |
| User Flow | Process | Flow | screens, actions, decisions | directed journey graph | transition routing | screen cards, decisions, arrows |
| Event Storming | Process | Flow | events, commands, actors, aggregates | ordered lanes/clusters | causal links | cards, lanes, groups, edges |
| Gantt | Planning | Timeline | tasks, durations, dependencies | time grid with tracks | dependency connectors | axis, bars, milestones, links |
| Roadmap | Planning | Timeline | periods, initiatives, milestones | time bands/tracks | limited dependency links | axis, bands, cards, milestones |
| Timeline | Planning | Timeline | dated events and intervals | single/multiple time axes | callout connectors | axis, events, intervals, labels |
| Calendar | Planning | Timeline | dates, events, recurrence | calendar time grid | usually none | grid, cells, event cards |
| Checklist | Planning | Board/List | groups and ordered items | vertical grouped lists | none | groups, rows, check markers |
| Kanban | Planning | Board/List | columns, cards, ordering | board columns | optional dependency links | lanes, cards, badges |
| Dependency Map | Planning | Graph | items and dependencies | dependency graph | directed dependency edges | boxes, groups, arrows |
| User Story Map | Product | Board/List | activities, tasks, releases | hierarchical rows/columns | usually none | lanes, cards, release bands |
| Impact Map | Product | Graph | goals, actors, impacts, deliverables | hierarchical radial/tree graph | parent-child edges | hierarchy nodes, groups, edges |
| Opportunity Solution Tree | Product | Graph | opportunities, solutions, experiments | hierarchical tree | parent-child edges | hierarchy nodes, cards, edges |
| Customer Journey Map | Product | Timeline | stages, actions, emotions, touchpoints | stage columns with aligned tracks | stage-to-stage flow | lanes, stage headers, curves, cards |
| Stakeholder Map | Product | Graph | stakeholders, groups, influence | radial/clustered graph | influence edges | nodes, groups, labels, edges |
| Feature Map | Product | Board/List | feature groups and hierarchy | grouped cards/tree rows | optional links | groups, cards, badges |
| Business Model Canvas | Business | Canvas | fixed named sections and entries | fixed region template | none | regions, headings, cards |
| SWOT | Business | Matrix | four named categories | fixed 2x2 matrix | none | matrix cells, headings, lists |
| SMART Goals | Business | Canvas | goal plus five criteria | fixed named regions | none | regions, headings, text blocks |
| Value Proposition Canvas | Business | Canvas | customer and value sections | fixed paired-region template | semantic pairing only | regions, cards, headings |
| RACI Matrix | Business | Matrix | activities, roles, assignments | row/column grid | none | headers, cells, badges |
| Risk Matrix | Business | Matrix | likelihood, impact, risks | scored matrix grid | none | axes, cells, markers, legend |
| Decision Matrix | Business | Matrix | options, criteria, scores | row/column grid | none | headers, cells, score badges |
| Data Lineage | Data | Graph | datasets, fields, transforms, lineage | layered mapping graph | field-level port routing | dataset boxes, rows, ports, directed edges |
| ETL Mapping | Data | Graph | sources, targets, transformations, field mappings | paired/layered mapping graph | dense field-level routing | tables, rows, ports, transform nodes, mapping edges |

## Architecture Consequences

- Domain packages own grammar, AST, validation, and semantic models.
- Family packages should own reusable render-model contracts and layout strategies.
- Routing should operate on positioned ports and obstacles, not domain AST nodes.
- SVG should consume positioned primitives rather than validated domain models.
- A diagram type may specialize a family without forking the whole renderer.
- Specialized Graph layouts may support topology, hierarchy, and mapping-style
  diagrams without creating separate top-level families.
- Cross-family hybrids should compose primitives and strategies rather than create
  a universal grammar.

## Open Questions

- How Graph family subtypes should share layout and routing primitives while
  supporting specialized styles such as topology, hierarchy, and mapping graphs.
- Whether Timeline and Board/List need a shared track/lane abstraction.
- How family render models expose accessibility and documentation metadata.
- How future layout preferences select strategies without becoming model semantics.
