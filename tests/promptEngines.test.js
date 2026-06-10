import assert from "node:assert/strict";
import test from "node:test";

import { createDiagnosticPromptRequest } from "../src/prompts/diagnosticPrompt.js";
import { createGuidePromptRequest } from "../src/prompts/guidePrompt.js";
import { createMemoryStore } from "../src/services/store.js";
import { createWorkflowService } from "../src/services/workflowService.js";
import { validateEnvironmentProfile } from "../src/validation/environmentProfile.js";

const environmentProfile = {
  profileName: "Test RTX workstation",
  os: {
    name: "Windows",
    version: "11",
    arch: "x64",
    defaultShell: "PowerShell"
  },
  hardware: {
    cpu: { model: "AMD Ryzen 7 7800X3D", cores: 8 },
    ramGb: 32,
    gpu: {
      vendor: "NVIDIA",
      model: "RTX 4070",
      vramGb: 12,
      driverVersion: "555.99",
      cudaVersion: "12.5"
    }
  },
  packageManagers: ["winget", "choco"],
  runtimes: {
    python: "3.12.3",
    node: "22.2.0"
  },
  importantPaths: {
    cuda: "C:\\Program Files\\NVIDIA GPU Computing Toolkit\\CUDA\\v12.5"
  }
};

test("guide prompt enforces advanced environment-aware output", () => {
  const request = createGuidePromptRequest({
    goal: "Set up Blender Cycles GPU rendering with OptiX and a custom cache path",
    domain: "blender",
    environmentProfile,
    controlFilters: {
      performance: true,
      environment: true,
      essentials: true
    },
    retrievedContext: [
      {
        title: "Blender manual",
        url: "https://docs.blender.org/manual",
        trustLevel: "official",
        excerpt: "Cycles supports CUDA and OptiX on supported NVIDIA GPUs."
      }
    ]
  });

  assert.equal(request.modelIntent, "advanced-environment-aware-guide");
  assert.match(request.messages[0].content, /Do not provide generic introductions/);
  assert.match(request.messages[0].content, /Do not invent flags/);
  assert.match(request.messages[1].content, /RTX 4070/);
  assert.match(request.messages[1].content, /Performance/);
  assert.match(request.messages[1].content, /outputSchema/);
});

test("diagnostic prompt carries workflow and log evidence", () => {
  const request = createDiagnosticPromptRequest({
    environmentProfile,
    workflowGoal: "Set up a Minecraft Fabric optimization stack",
    domain: "games",
    currentStep: { title: "Install Fabric Loader" },
    completedSteps: [{ title: "Install Java 21" }],
    errorLog: "java.lang.UnsupportedClassVersionError: class file version 65.0"
  });

  assert.equal(request.modelIntent, "self-healing-diagnostic-patch");
  assert.match(request.messages[0].content, /Do not provide generic troubleshooting lists/);
  assert.match(request.messages[1].content, /UnsupportedClassVersionError/);
  assert.match(request.messages[1].content, /Install Java 21/);
});

test("environment profile validation requires OS but tolerates missing optional scan data", () => {
  const invalid = validateEnvironmentProfile({ hardware: { ramGb: 16 } });
  assert.equal(invalid.valid, false);
  assert.deepEqual(invalid.errors, ["os.name is required"]);

  const valid = validateEnvironmentProfile({
    os: { name: "Linux" },
    hardware: { gpu: { vendor: "AMD" } }
  });
  assert.equal(valid.valid, true);
  assert.ok(valid.warnings.length > 0);
});

test("workflow service creates guide and diagnostic prompt requests", () => {
  const service = createWorkflowService(createMemoryStore());
  const workflow = service.createWorkflowRun({
    goal: "Configure Prism Launcher with Sodium and exact JVM flags",
    domain: "games",
    environmentProfile,
    controlFilters: {
      launchers: true,
      performance: true,
      environment: true
    }
  });

  assert.equal(workflow.workflowRun.domain, "games");
  assert.equal(workflow.environmentProfile.hardware.gpu.vendor, "NVIDIA");
  assert.equal(workflow.promptRequest.responseFormat, "json");

  const diagnostic = service.createDiagnosticPatch({
    workflowRunId: workflow.workflowRun.id,
    currentStep: { title: "Launch Minecraft" },
    errorLog: "Error: Could not find or load main class net.fabricmc.loader.impl.launch.knot.KnotClient"
  });

  assert.equal(diagnostic.errorEvent.workflowRunId, workflow.workflowRun.id);
  assert.equal(diagnostic.promptRequest.modelIntent, "self-healing-diagnostic-patch");
});
