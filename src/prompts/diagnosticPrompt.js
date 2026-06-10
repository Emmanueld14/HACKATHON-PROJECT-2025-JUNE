export const DIAGNOSTIC_OUTPUT_SCHEMA = {
  type: "object",
  required: [
    "errorSummary",
    "probableRootCause",
    "evidenceFromLog",
    "patchCommands",
    "filesModified",
    "validationCommand",
    "rollbackPlan",
    "updatedNextStep"
  ],
  properties: {
    errorSummary: { type: "string" },
    probableRootCause: { type: "string" },
    evidenceFromLog: { type: "array", items: { type: "string" } },
    patchCommands: {
      type: "array",
      items: {
        type: "object",
        required: ["shell", "command", "purpose", "riskLevel"],
        properties: {
          shell: { type: "string" },
          command: { type: "string" },
          purpose: { type: "string" },
          riskLevel: { type: "string", enum: ["low", "medium", "high"] },
          requiresAdmin: { type: "boolean" }
        }
      }
    },
    filesModified: {
      type: "array",
      items: {
        type: "object",
        required: ["path", "change"],
        properties: {
          path: { type: "string" },
          change: { type: "string" }
        }
      }
    },
    validationCommand: {
      type: "object",
      required: ["shell", "command", "expectedOutput"],
      properties: {
        shell: { type: "string" },
        command: { type: "string" },
        expectedOutput: { type: "string" }
      }
    },
    rollbackPlan: { type: "string" },
    updatedNextStep: { type: "string" },
    remainingWorkflowChanges: {
      type: "array",
      items: { type: "string" }
    }
  }
};

export const DIAGNOSTIC_SYSTEM_PROMPT = `You are LastResort AI Diagnostic Mode.

The user hit an error inside an active workflow. Pause the tutorial and repair the specific failure before continuing.

Hard rules:
1. Do not provide generic troubleshooting lists.
2. Tie the diagnosis to the user's actual OS, hardware, installed tools, paths, versions, and completed workflow steps.
3. Use the submitted error log as evidence. Quote the exact lines or symptoms that matter.
4. Provide exact commands or file edits. Include shell type, purpose, risk level, and admin requirement.
5. Explain what each patch command changes.
6. Include one validation command with expected output.
7. Include a rollback command or manual undo path whenever state changes are made.
8. Do not say "try reinstalling" unless removal targets, install source, version constraints, and verification commands are all specified.
9. If multiple root causes are plausible, choose the most likely one and list what evidence would disprove it.
10. If the fix changes the environment, update the remaining workflow assumptions.
11. Do not invent paths, flags, package names, registry keys, or config fields. Ask for one missing detail if needed.

Return only data that matches the provided JSON output schema.`;

export function buildDiagnosticMessages({
  environmentProfile,
  workflowGoal,
  domain,
  currentStep,
  completedSteps = [],
  errorLog,
  screenshotOcr = null,
  retrievedContext = []
}) {
  assertObject(environmentProfile, "environmentProfile");
  assertNonEmptyString(workflowGoal, "workflowGoal");
  assertNonEmptyString(domain, "domain");
  assertNonEmptyString(errorLog, "errorLog");

  return [
    {
      role: "system",
      content: DIAGNOSTIC_SYSTEM_PROMPT
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          task: "Diagnose and patch a failed LastResort AI workflow step.",
          domain,
          workflowGoal,
          environmentProfile,
          currentStep,
          completedSteps,
          userSubmittedErrorLog: errorLog,
          screenshotOcr,
          retrievedContext: normalizeRetrievedContext(retrievedContext),
          outputSchema: DIAGNOSTIC_OUTPUT_SCHEMA
        },
        null,
        2
      )
    }
  ];
}

export function createDiagnosticPromptRequest(input) {
  return {
    modelIntent: "self-healing-diagnostic-patch",
    temperature: 0.1,
    responseFormat: "json",
    messages: buildDiagnosticMessages(input)
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
