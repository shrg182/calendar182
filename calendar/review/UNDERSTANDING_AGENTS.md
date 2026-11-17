# Understanding agents in Calendar

An AI agent receives a goal, chooses actions and tools within its permissions, examines results, and adjusts its next step. The surrounding software supplies the tools, boundaries, and execution environment. An agent can still make mistakes; tests and review remain necessary.

## The agent's working loop

![How an AI agent works](./agent-working-loop.svg)

```mermaid
flowchart LR
    Goal["Goal from a person<br/>Example: fix note saving"] --> Plan["Agent decides<br/>Inspect code and reproduce issue"]
    Plan --> Act["Agent uses tools<br/>Read files, edit code, run tests"]
    Act --> Check["Agent checks results<br/>Did the fix work?"]
    Check -->|Needs more work| Plan
    Check -->|Evidence supports completion| Report["Report result<br/>Changes, checks, limitations"]
```

## Two places agents can work

![Development agents and the optional Calendar Assistant](./calendar-agents-explained.svg)

```mermaid
flowchart TB
    Owner["YOU<br/>Set goals and approve important decisions"]

    subgraph Dev["1. DEVELOPMENT AGENTS — work in Codex to build the app"]
      Coordinator["Coordinator Agent<br/>Breaks down work and coordinates integration"]
      Architecture["Architecture Agent<br/>Defines module boundaries and interfaces"]
      Frontend["Frontend Agent<br/>Builds calendar screens"]
      Logic["Calendar Logic Agent<br/>Implements calculation rules"]
      Storage["Storage Agent<br/>Builds notes, backups, and sync"]
      Testing["Testing Agent<br/>Runs checks and investigates failures"]
      Reviewer["Review Agent<br/>Checks changes, risks, and evidence"]
      Coordinator --> Architecture
      Architecture --> Frontend
      Architecture --> Logic
      Architecture --> Storage
      Frontend --> Testing
      Logic --> Testing
      Storage --> Testing
      Testing --> Reviewer
      Reviewer -->|Findings for revision| Coordinator
    end

    Owner --> Coordinator
    Reviewer -->|Reviewed code builds the product| App

    subgraph Runtime["2. FINISHED CALENDAR APP — runs on the user's device"]
      App["Calendar UI<br/>Month view, day details, notes, settings"]
      Assistant["Optional Calendar Assistant Agent<br/>Understands requests and chooses allowed tools"]
      Services["APPLICATION MODULES<br/>Calendar engine, notes search, save service"]
      Data[("Local data<br/>Notes and settings")]
      App -->|Ordinary taps and clicks| Services
      App -->|Natural-language request| Assistant
      Assistant -->|Calls reviewed tools| Services
      Services --> Data
      Services -->|Tool results| Assistant
    end
```

The development agents produce code; they do not need to remain running for Calendar to work. The optional Assistant is part of the user experience and uses the finished application's services.

## Concrete distinction

| Agent or module | Example |
|---|---|
| Storage Agent during development | Investigates lost notes, edits storage code, runs recovery tests, and reports evidence. |
| Notes module in the finished app | Executes a defined save operation when called. |
| Optional Assistant Agent in the finished app | Interprets “Find my travel notes from October,” calls search tools, and presents the results. |

An agent chooses which allowed operations to perform toward a goal. A module executes the operation it was given. Modules may themselves use AI; using AI alone does not make a module an agent.

## What “multi-agent” means

Multiple agent instances can receive separate assignments and exchange results, coordinated around shared requirements. Merely naming several roles in a diagram does not create separate running agents. One agent can also take several roles sequentially. Separate agents are useful when independent investigation, parallel work, or review justifies the coordination overhead.

These are conceptual diagrams. They do not mean that all these agents or the optional Calendar Assistant currently exist or are running.
