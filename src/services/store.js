import { randomUUID } from "node:crypto";

export function createMemoryStore() {
  const environmentProfiles = new Map();
  const workflowRuns = new Map();
  const errorEvents = new Map();
  const diagnosticPatches = new Map();

  return {
    createEnvironmentProfile(profile, warnings = []) {
      const now = new Date().toISOString();
      const id = profile.id ?? randomUUID();
      const record = {
        ...profile,
        id,
        warnings,
        createdAt: now,
        updatedAt: now
      };

      environmentProfiles.set(id, record);
      return record;
    },

    getEnvironmentProfile(id) {
      return environmentProfiles.get(id) ?? null;
    },

    createWorkflowRun(workflowRun) {
      const now = new Date().toISOString();
      const id = randomUUID();
      const record = {
        ...workflowRun,
        id,
        status: workflowRun.status ?? "prompt_ready",
        createdAt: now,
        updatedAt: now
      };

      workflowRuns.set(id, record);
      return record;
    },

    getWorkflowRun(id) {
      return workflowRuns.get(id) ?? null;
    },

    createErrorEvent(errorEvent) {
      const now = new Date().toISOString();
      const id = randomUUID();
      const record = {
        ...errorEvent,
        id,
        resolved: false,
        createdAt: now
      };

      errorEvents.set(id, record);
      return record;
    },

    createDiagnosticPatch(patch) {
      const now = new Date().toISOString();
      const id = randomUUID();
      const record = {
        ...patch,
        id,
        applied: false,
        createdAt: now
      };

      diagnosticPatches.set(id, record);
      return record;
    },

    listWorkflowRuns() {
      return [...workflowRuns.values()];
    }
  };
}
