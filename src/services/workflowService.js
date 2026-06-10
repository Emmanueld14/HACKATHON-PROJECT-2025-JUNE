import { createDiagnosticPromptRequest } from "../prompts/diagnosticPrompt.js";
import { createGuidePromptRequest } from "../prompts/guidePrompt.js";
import { normalizeEnvironmentProfile, validateEnvironmentProfile } from "../validation/environmentProfile.js";

const ALLOWED_DOMAINS = new Set(["games", "programming", "blender", "editing", "sports", "aob"]);

export function createWorkflowService(store) {
  return {
    createEnvironmentProfile(input) {
      const validation = validateEnvironmentProfile(input);
      if (!validation.valid) {
        const error = new Error("Invalid environment profile");
        error.statusCode = 422;
        error.details = validation.errors;
        throw error;
      }

      return store.createEnvironmentProfile(validation.profile, validation.warnings);
    },

    createWorkflowRun(input) {
      const goal = requireString(input.goal ?? input.userGoal, "goal");
      const domain = normalizeDomain(input.domain);
      const controlFilters = normalizeControlFilters(input.controlFilters ?? input.control_filters);
      const retrievedContext = Array.isArray(input.retrievedContext) ? input.retrievedContext : [];

      let environmentProfile = null;

      if (input.environmentProfileId) {
        environmentProfile = store.getEnvironmentProfile(input.environmentProfileId);
        if (!environmentProfile) {
          const error = new Error("Environment profile not found");
          error.statusCode = 404;
          throw error;
        }
      } else if (input.environmentProfile) {
        const validation = validateEnvironmentProfile(input.environmentProfile);
        if (!validation.valid) {
          const error = new Error("Invalid environment profile");
          error.statusCode = 422;
          error.details = validation.errors;
          throw error;
        }
        environmentProfile = store.createEnvironmentProfile(validation.profile, validation.warnings);
      } else {
        const error = new Error("environmentProfile or environmentProfileId is required");
        error.statusCode = 422;
        throw error;
      }

      const promptRequest = createGuidePromptRequest({
        goal,
        domain,
        environmentProfile,
        controlFilters,
        retrievedContext
      });

      const workflowRun = store.createWorkflowRun({
        userId: input.userId ?? environmentProfile.userId ?? null,
        environmentProfileId: environmentProfile.id,
        domain,
        goal,
        controlFilters,
        retrievedContext,
        promptRequest
      });

      return {
        workflowRun,
        environmentProfile,
        promptRequest
      };
    },

    getWorkflowRun(id) {
      const workflowRun = store.getWorkflowRun(id);
      if (!workflowRun) {
        const error = new Error("Workflow run not found");
        error.statusCode = 404;
        throw error;
      }

      return workflowRun;
    },

    createDiagnosticPatch(input) {
      const workflowRun = store.getWorkflowRun(requireString(input.workflowRunId, "workflowRunId"));
      if (!workflowRun) {
        const error = new Error("Workflow run not found");
        error.statusCode = 404;
        throw error;
      }

      const environmentProfile = store.getEnvironmentProfile(workflowRun.environmentProfileId);
      const errorLog = requireString(input.errorLog ?? input.userSubmittedLog, "errorLog");
      const currentStep = input.currentStep ?? input.workflowStep ?? null;
      const completedSteps = Array.isArray(input.completedSteps) ? input.completedSteps : [];
      const retrievedContext = Array.isArray(input.retrievedContext) ? input.retrievedContext : workflowRun.retrievedContext;

      const errorEvent = store.createErrorEvent({
        workflowRunId: workflowRun.id,
        workflowStepId: input.workflowStepId ?? null,
        errorType: input.errorType ?? "user_submitted_log",
        userSubmittedLog: errorLog,
        screenshotOcr: input.screenshotOcr ?? null
      });

      const promptRequest = createDiagnosticPromptRequest({
        environmentProfile,
        workflowGoal: workflowRun.goal,
        domain: workflowRun.domain,
        currentStep,
        completedSteps,
        errorLog,
        screenshotOcr: input.screenshotOcr ?? null,
        retrievedContext
      });

      const diagnosticPatch = store.createDiagnosticPatch({
        errorEventId: errorEvent.id,
        workflowRunId: workflowRun.id,
        promptRequest
      });

      return {
        workflowRun,
        errorEvent,
        diagnosticPatch,
        promptRequest
      };
    },

    normalizeEnvironmentProfile
  };
}

function normalizeDomain(value) {
  const domain = requireString(value, "domain").trim().toLowerCase();
  return ALLOWED_DOMAINS.has(domain) ? domain : "aob";
}

function normalizeControlFilters(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return {
    launchers: Boolean(value.launchers),
    performance: Boolean(value.performance),
    essentials: Boolean(value.essentials),
    environment: Boolean(value.environment),
    cheats: Boolean(value.cheats)
  };
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 422;
    throw error;
  }

  return value.trim();
}
