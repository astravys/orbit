# ORBIT

**ORBIT Builds Interconnected Topologies**

[English](#english) | [Русский](#русский)

# English

## What is ORBIT?

ORBIT is a human- and AI-friendly diagram modeling system.

People increasingly explore products, databases, software architectures, and
workflows together with AI. Plain text works well at first, but complex ideas
quickly become difficult to discuss without showing their structure and
relationships.

Diagrams make that structure clear to people. Structured text is easier for AI
systems to read, write, and modify reliably. Traditional diagram files usually
favor the first need, while plain text favors the second.

ORBIT connects both:

- Humans view a generated diagram.
- AI reads and writes the underlying ORBIT model.
- Teams review, edit, diff, and version that model like source code.
- One document provides a visual diagram for people and structured context for AI.

ORBIT is more than a markup format. It is intended as an ecosystem of
domain-specific modeling grammars, validation tools, automatic layout, and
renderers built on a shared language core.

## What can it be used for?

- Brainstorm complex ideas with AI.
- Design software architecture and databases.
- Plan products, projects, and processes.
- Keep diagrams alongside project documentation.
- Give AI agents precise, structured context.
- Generate diagrams instead of redrawing them manually.

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

The model can be validated, inspected as structured data, and rendered as SVG.

## Project status

Current version: [`v0.1.0-alpha.1`](https://github.com/lunarmolly/orbit-language/tree/v0.1.0-alpha.1)

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

Pre-1.0 releases may change language syntax and public APIs.

## Learn more

See the [ORBIT Wiki](https://github.com/lunarmolly/orbit-language/wiki) for the
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

ORBIT — система моделирования диаграмм, удобная для людей и ИИ.

Люди всё чаще вместе с ИИ прорабатывают продукты, базы данных, архитектуру
программных систем и рабочие процессы. На раннем этапе достаточно обычного
текста, но по мере роста идеи её структуру и связи становится трудно обсуждать
без визуального представления.

Люди хорошо воспринимают диаграммы. Системам ИИ проще надёжно читать, создавать
и изменять структурированный текст. Традиционные форматы диаграмм обычно
ориентированы на первую задачу, а обычный текст — на вторую.

ORBIT соединяет оба подхода:

- Люди работают с созданной диаграммой.
- ИИ читает и записывает исходную модель ORBIT.
- Команда редактирует, сравнивает, рецензирует и версионирует модель как код.
- Один документ становится визуальной диаграммой для людей и структурированным
  контекстом для ИИ.

ORBIT — не только формат разметки. Проект развивается как экосистема
предметно-ориентированных грамматик, средств проверки, автоматической
компоновки и рендереров на общем языковом ядре.

## Для чего можно использовать ORBIT?

- Прорабатывать сложные идеи вместе с ИИ.
- Проектировать архитектуру программ и базы данных.
- Планировать продукты, проекты и процессы.
- Хранить диаграммы рядом с документацией проекта.
- Передавать ИИ-агентам точный структурированный контекст.
- Создавать диаграммы автоматически вместо ручной перерисовки.

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

Модель можно проверить, изучить как структурированные данные и отрендерить в SVG.

## Состояние проекта

Текущая версия: [`v0.1.0-alpha.1`](https://github.com/lunarmolly/orbit-language/tree/v0.1.0-alpha.1)

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

До версии 1.0 синтаксис языка и публичные API могут изменяться.

## Подробнее

Спецификация языка, рекомендации по моделированию, архитектура и список типов
диаграмм находятся в [Wiki ORBIT](https://github.com/lunarmolly/orbit-language/wiki).

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
