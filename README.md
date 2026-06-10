# LastResort AI

Environment-aware onboarding and self-healing workflow assistant for technical domains such as Gaming, Programming, Blender, and Video Editing.

This repository now includes:

- The extracted static homepage and games-node prototypes.
- A dependency-free Node API server.
- Core anti-basic guide and diagnostic prompt engines.
- Environment profile normalization/validation.
- A Postgres-ready schema for profiles, workflow runs, steps, RAG sources, error events, and diagnostic patches.

## Run locally

```bash
npm start
```

Open `http://localhost:3000`.

Useful routes:

- `GET /` - LastResort AI homepage and workflow prompt builder.
- `GET /games` - Existing games/category node prototype.
- `GET /health` - API health check.
- `POST /api/workflow-runs` - Create an environment-aware guide prompt request.
- `POST /api/workflow-runs/:id/errors` - Create a self-healing diagnostic prompt request.

## Test

```bash
npm test
```

## Project structure

```text
Hackathon_project_HomePage/          Static homepage prototype connected to the API
Hackathon-project-number-1-main/     Existing games node prototype and assets
src/db/schema.sql                    Postgres schema
src/prompts/                         Guide and diagnostic prompt engines
src/server/                          Node HTTP API/static server
src/services/                        Workflow orchestration and in-memory store
src/validation/                      Environment profile normalization
tests/                               Node test suite
docs/architecture.md                 Architecture and API notes
```

## Current MVP behavior

The server returns model-ready prompt requests. It does not call an LLM provider yet. The next production step is to add a model adapter, validate model JSON output, and persist generated guide steps into `workflow_steps`.