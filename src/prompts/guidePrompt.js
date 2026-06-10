export const GUIDE_OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "assumptions",
    "environmentFindings",
    "compatibilityRisks",
    "steps",
    "validationChecklist",
    "troubleshootingEntryPoints"
  ],
  properties: {
    assumptions: {
      type: "array",
      items: { type: "string" }
    },
    environmentFindings: {
      type: "array",
      items: { type: "string" }
    },
    compatibilityRisks: {
      type: "array",
      items: { type: "string" }
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        required: [
          "title",
          "objective",
          "exactActions",
          "commands",
          "paths",
          "environmentVariables",
          "expectedOutput",
          "validationCheck",
          "failureSymptoms",
          "recoveryPath",
          "riskLevel"
        ],
        properties: {
          title: { type: "string" },
          objective: { type: "string" },
          exactActions: { type: "array", items: { type: "string" } },
          commands: {
            type: "array",
            items: {
              type: "object",
              required: ["shell", "command", "purpose"],
              properties: {
                shell: { type: "string" },
                command: { type: "string" },
                purpose: { type: "string" },
                requiresAdmin: { type: "boolean" }
              }
            }
          },
          paths: { type: "array", items: { type: "string" } },
          environmentVariables: {
            type: "array",
            items: {
              type: "object",
              required: ["name", "value", "scope"],
              properties: {
                name: { type: "string" },
                value: { type: "string" },
                scope: { type: "string" }
              }
            }
          },
          expectedOutput: { type: "string" },
          validationCheck: { type: "string" },
          failureSymptoms: { type: "array", items: { type: "string" } },
          recoveryPath: { type: "string" },
          riskLevel: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    },
    performanceOptimizations: {
      type: "array",
      items: { type: "string" }
    },
    environmentPathPlan: {
      type: "array",
      items: { type: "string" }
    },
    shortcutsAndAutomation: {
      type: "array",
      items: { type: "string" }
    },
    validationChecklist: {
      type: "array",
      items: { type: "string" }
    },
    troubleshootingEntryPoints: {
      type: "array",
      items: { type: "string" }
    }
  }
};

export const GUIDE_SYSTEM_PROMPT = `You are LastResort AI, an advanced technical onboarding engine.

Your job is to generate environment-aware, non-basic, deeply specific workflow guides for complex technical tasks across Gaming, Programming, Blender, Video Editing, and adjacent domains.

Hard rules:
1. Do not provide generic introductions, beginner definitions, motivational filler, or surface-level overviews.
2. Do not explain basic concepts unless the explanation changes a configuration decision.
3. Do not say "install X" without version constraints, source, target path, command, and verification step.
4. Do not assume a perfect machine. Treat drivers, PATH, package managers, conflicting versions, permissions, shell differences, and hardware limits as first-class constraints.
5. Tailor every instruction to the supplied environment profile.
6. Split GPU paths when relevant: NVIDIA CUDA, AMD ROCm, Apple Metal, Intel iGPU, and CPU-only fallback.
7. Split OS instructions when relevant: Windows PowerShell, Windows CMD, macOS zsh, Linux bash, or WSL.
8. Prefer official documentation and retrieved source material over memory.
9. If retrieved sources conflict, prioritize official docs, then maintained GitHub READMEs, then specialized community wikis, then forum posts.
10. Do not invent flags, registry keys, commands, config options, filenames, or paths.
11. If a required detail is missing, ask only for the minimum missing detail and stop before generating risky commands.
12. Mark destructive, admin, driver-level, registry, sudo, or privileged commands clearly.
13. Add validation commands after every major setup step.
14. Add rollback notes when modifying PATH, drivers, runtime versions, config files, registry settings, launch flags, or package manager state.
15. Every step must include failure symptoms and a recovery path so the self-healing loop can continue from the exact failure point.

Return only data that matches the provided JSON output schema.`;

const CONTROL_FILTER_GUIDANCE = {
  launchers:
    "Include launcher/runtime selection, account/auth assumptions, install locations, and launch argument handling.",
  performance:
    "Inject hardware optimization steps, memory allocation decisions, GPU acceleration checks, cache clearing, and benchmark validation.",
  essentials:
    "Prioritize required runtimes, drivers, package managers, plugins, and compatibility versions before optional enhancements.",
  environment:
    "Show exact file paths, directory structures, config files, PATH edits, env vars, and shell-specific persistence commands.",
  cheats:
    "Include safe shortcuts, macros, terminal hotkeys, scripts, templates, and repeatable automation. Avoid game cheating or ToS-violating bypasses."
};

export function buildGuideMessages({
  goal,
  domain,
  environmentProfile,
  controlFilters = {},
  retrievedContext = [],
  previousSteps = []
}) {
  assertNonEmptyString(goal, "goal");
  assertNonEmptyString(domain, "domain");
  assertObject(environmentProfile, "environmentProfile");

  const enabledFilters = Object.entries(controlFilters)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([name]) => name);

  return [
    {
      role: "system",
      content: GUIDE_SYSTEM_PROMPT
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "Generate an advanced LastResort AI workflow guide.",
          domain,
          goal,
          environmentProfile,
          enabledControlFilters: enabledFilters,
          controlFilterGuidance: enabledFilters.reduce((guidance, filterName) => {
            guidance[filterName] =
              CONTROL_FILTER_GUIDANCE[filterName] ?? "Apply this control filter where technically relevant.";
            return guidance;
          }, {}),
          retrievedContext: normalizeRetrievedContext(retrievedContext),
          previousSteps,
          outputSchema: GUIDE_OUTPUT_SCHEMA
        },
        null,
        2
      )
    }
  ];
}

export function createGuidePromptRequest(input) {
  return {
    modelIntent: "advanced-environment-aware-guide",
    temperature: 0.2,
    responseFormat: "json",
    messages: buildGuideMessages(input)
  };
}

function normalizeRetrievedContext(retrievedContext) {
  if (!Array.isArray(retrievedContext)) {
    return [];
  }

  return retrievedContext.map((source, index) => ({
    index,
    title: source.title ?? "Untitled source",
    url: source.url ?? null,
    trustLevel: source.trustLevel ?? source.trust_level ?? "unknown",
    excerpt: source.excerpt ?? source.chunkText ?? source.chunk_text ?? String(source)
  }));
}

function assertNonEmptyString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
}

function assertObject(value, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object`);
  }
}
