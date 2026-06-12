# ORBIT

**ORBIT Builds Interconnected Topologies**

[English](#english) | [Русский](#русский)

# English

## What is ORBIT?

ORBIT is a human- and AI-friendly modeling system that turns structured text
into diagrams and gives AI systems structured access to the same underlying
model.

An ORBIT document is the source of truth. People can view it as a diagram, while
AI agents and tools can read, write, validate, transform, and regenerate it.
Because the model is text, it can be reviewed, diffed, versioned, and stored
alongside code and documentation.

ORBIT is not only a markup language. It is intended as an ecosystem of
domain-specific modeling grammars, validation tools, automatic layout, and
renderers built on a shared language core.

## Why ORBIT?

Diagrams and structured text solve opposite sides of the same problem.

Humans understand complex structures and relationships well through diagrams.
AI systems work more reliably with structured text. As an idea grows, explaining
it in prose consumes context and hides connections. A diagram makes those
connections visible, but traditional diagram files are difficult for AI to
reliably read, edit, diff, validate, or regenerate.

ORBIT bridges that gap. It is useful when an idea has become too complex for
plain text, a diagram would explain it better, drawing it manually would take
too long, and an AI agent also needs to understand or modify the model.

## What can it be used for?

- Explore and refine complex ideas with AI.
- Design software architecture and databases.
- Plan products, projects, and processes.
- Carry a model from ideation into implementation.
- Keep diagrams as maintainable project documentation.
- Give AI agents precise, structured context.
- Generate diagrams without drawing them manually.

## Example

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

The same model can be validated, inspected as structured data, and rendered as SVG.

## Project status

| Concept        | Current                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| Wave           | 1                                                                         |
| Specification  | 0.1                                                                       |
| Implementation | [`v0.1.0-alpha.1`](https://github.com/astravys/orbit/tree/v0.1.0-alpha.1) |

**Wave 1:** Database Schema

Implemented:

- Parser
- Validation
- SVG rendering
- CLI

In progress:

- Layout engine improvements
- Relationship routing
- Rendering quality

Planned:

- Additional diagram families
- Playground
- Multiple export targets

## Versioning

ORBIT separates three related concepts:

- **Wave** describes roadmap scope and supported diagram capabilities. It is not
  a compatibility guarantee.
- **Specification Version** describes language syntax, semantics, grammar, and
  validation rules.
- **Implementation Version** describes releases of the parser, validator,
  renderer, CLI, playground, and related tooling.

Pre-1.0 specifications and implementation APIs may change. See
[Versioning](https://github.com/astravys/orbit/wiki/4.-Versioning)
for the compatibility direction and release rules.

## Learn more

See the [ORBIT Wiki](https://github.com/astravys/orbit/wiki) for the
language specification, modeling guidelines, architecture, and supported
diagram types.

## Development

```sh
corepack enable
pnpm install
pnpm build
pnpm test
pnpm lint
```

```sh
pnpm orbit validate docs/examples/customer-database.orbit
pnpm orbit render docs/examples/customer-database.orbit --output schema.svg
```

Development follows `dev -> pull request -> main`.

# Русский

## Что такое ORBIT?

ORBIT — система моделирования, удобная для людей и ИИ. Она превращает
структурированный текст в диаграммы и предоставляет системам ИИ доступ к той же
исходной модели.

Документ ORBIT является источником истины. Люди могут видеть его как диаграмму,
а ИИ-агенты и инструменты — читать, создавать, проверять, преобразовывать и
повторно визуализировать. Поскольку модель хранится в виде текста, её можно
рецензировать, сравнивать, версионировать и хранить рядом с кодом и документацией.

ORBIT — не только язык разметки. Проект развивается как экосистема
предметно-ориентированных грамматик, средств проверки, автоматической
компоновки и рендереров на общем языковом ядре.

## Зачем нужен ORBIT?

Диаграммы и структурированный текст решают разные стороны одной задачи.

Люди хорошо понимают сложные структуры и связи через диаграммы. Системы ИИ
надёжнее работают со структурированным текстом. Когда идея растёт, её описание
обычным текстом расходует контекст и скрывает связи. Диаграмма делает их
видимыми, но традиционные файлы диаграмм трудно надёжно читать, изменять,
сравнивать, проверять и пересоздавать средствами ИИ.

ORBIT устраняет этот разрыв. Он полезен, когда идея стала слишком сложной для
обычного текста, диаграмма объяснила бы её лучше, ручное рисование заняло бы
слишком много времени, а ИИ-агенту также нужно понимать или изменять модель.

## Для чего можно использовать ORBIT?

- Прорабатывать и уточнять сложные идеи вместе с ИИ.
- Проектировать архитектуру программ и базы данных.
- Планировать продукты, проекты и процессы.
- Переносить модель от идеи к реализации.
- Поддерживать диаграммы как актуальную документацию проекта.
- Передавать ИИ-агентам точный структурированный контекст.
- Создавать диаграммы без ручной отрисовки.

## Пример

```orbit
"""
База данных для управления клиентами.
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

Одну модель можно проверить, изучить как структурированные данные и отрендерить в SVG.

## Состояние проекта

| Понятие      | Текущее значение                                                          |
| ------------ | ------------------------------------------------------------------------- |
| Волна        | 1                                                                         |
| Спецификация | 0.1                                                                       |
| Реализация   | [`v0.1.0-alpha.1`](https://github.com/astravys/orbit/tree/v0.1.0-alpha.1) |

**Волна 1:** Database Schema

Реализовано:

- Парсер
- Валидация
- SVG-рендеринг
- CLI

В работе:

- Улучшение движка компоновки
- Маршрутизация связей
- Качество визуализации

Запланировано:

- Дополнительные семейства диаграмм
- Playground
- Несколько форматов экспорта

## Версионирование

ORBIT разделяет три связанных понятия:

- **Волна** описывает этап дорожной карты и поддерживаемые возможности диаграмм.
  Она не является гарантией совместимости.
- **Версия спецификации** описывает синтаксис, семантику, грамматику и правила
  валидации языка.
- **Версия реализации** описывает выпуски парсера, валидатора, рендерера, CLI,
  playground и связанных инструментов.

Спецификации и API реализации до версии 1.0 могут изменяться. Направление
совместимости и правила выпусков описаны на странице
[Версионирование](https://github.com/astravys/orbit/wiki/4.-Versioning).

## Подробнее

Спецификация языка, рекомендации по моделированию, архитектура и список типов
диаграмм находятся в [Wiki ORBIT](https://github.com/astravys/orbit/wiki).

## Разработка

```sh
corepack enable
pnpm install
pnpm build
pnpm test
pnpm lint
```

```sh
pnpm orbit validate docs/examples/customer-database.orbit
pnpm orbit render docs/examples/customer-database.orbit --output schema.svg
```

Рабочий процесс разработки: `dev -> pull request -> main`.
