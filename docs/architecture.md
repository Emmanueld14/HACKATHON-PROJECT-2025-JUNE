# LastResort AI Architecture

LastResort AI is structured as an environment-aware workflow engine instead of a generic chat UI.

## Runtime flow

1. A user enters a complex technical goal in the existing homepage prototype.
2. The UI sends the goal, selected domain, control filters, and environment profile to `POST /api/workflow-runs`.
3. The workflow service validates and normalizes the environment profile.
4. The guide prompt engine builds a model-ready JSON request using the anti-basic system prompt.
5. The API returns the prompt request. In production, this request should be sent to the selected model provider and the JSON response should be stored as workflow steps.
6. If the user hits an error, the UI/API can submit logs to `POST /api/workflow-runs/:id/errors`.
7. The diagnostic prompt engine creates a self-healing repair request tied to the workflow, current step, completed steps, environment profile, and pasted log.

## Key modules

- `src/prompts/guidePrompt.js` - Core anti-basic guide prompt and structured output schema.
- `src/prompts/diagnosticPrompt.js` - Self-healing diagnostic prompt and patch output schema.
- `src/validation/environmentProfile.js` - Normalizes hardware, OS, runtime, path, and environment variable scan data.
- `src/services/workflowService.js` - Coordinates environment profile creation, workflow runs, and diagnostic patches.
- `src/server/app.js` - Dependency-free Node HTTP API and static file server for the extracted prototypes.
- `src/db/schema.sql` - Postgres schema for persistent profiles, workflow runs, steps, RAG sources, errors, and patches.

## API endpoints

### `GET /health`

Returns service status.

### `POST /api/environment-profiles`

Stores a normalized environment profile.

### `POST /api/workflow-runs`

Creates a workflow run and returns the model-ready guide prompt request.

Example body:

```json
{
  "domain": "games",
  "goal": "Configure Prism Launcher with Sodium and exact JVM flags",
  "environmentProfile": {
    "profileName": "Windows gaming rig",
    "os": {
      "name": "Windows",
      "version": "11",
      "arch": "x64",
      "defaultShell": "PowerShell"
    },
    "hardware": {
      "cpu": {
        "model": "AMD Ryzen 7 7800X3D",
        "cores": 8
      },
      "ramGb": 32,
      "gpu": {
        "vendor": "NVIDIA",
        "model": "RTX 4070",
        "driverVersion": "555.99",
        "cudaVersion": "12.5"
      }
    }
  },
  "controlFilters": {
    "launchers": true,
    "performance": true,
    "essentials": true,
    "environment": true,
    "cheats": false
  }
}
```

### `POST /api/workflow-runs/:id/errors`

Creates a diagnostic patch prompt request from a pasted error log.

Example body:

```json
{
  "currentStep": {
    "title": "Launch Minecraft with Fabric"
  },
  "completedSteps": [
    {
      "title": "Install Java 21"
    }
  ],
  "errorLog": "Error: Could not find or load main class net.fabricmc.loader.impl.launch.knot.KnotClient"
}
```

## Production next steps

1. Add a model provider adapter that sends `promptRequest.messages` to the chosen LLM and validates the JSON response against the schemas.
2. Persist workflow guide responses into `workflow_steps`.
3. Replace the placeholder RAG context in `lastresort-client.js` with a retriever over `rag_sources` and `rag_chunks`.
4. Add an environment scan script that emits the JSON shape accepted by `environmentProfile`.
5. Add Discord escalation by posting workflow/environment/error summaries only after explicit user action.
