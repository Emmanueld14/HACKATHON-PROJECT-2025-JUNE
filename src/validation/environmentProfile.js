const DEFAULT_PROFILE_NAME = "Primary machine";

export function normalizeEnvironmentProfile(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("environment profile must be an object");
  }

  const os = normalizeOs(input.os ?? input.operatingSystem ?? input);
  const hardware = normalizeHardware(input.hardware ?? input);
  const runtimes = normalizeRecord(input.runtimes ?? input.installedTools ?? input.installed_tools);
  const packageManagers = normalizeArray(input.packageManagers ?? input.package_managers);
  const environmentVariables = normalizeRecord(
    input.environmentVariables ?? input.environment_variables ?? input.env
  );
  const importantPaths = normalizeRecord(input.importantPaths ?? input.important_paths ?? input.paths);

  return {
    id: input.id ?? null,
    userId: input.userId ?? input.user_id ?? null,
    profileName: input.profileName ?? input.profile_name ?? DEFAULT_PROFILE_NAME,
    os,
    hardware,
    shell: input.shell ?? os.defaultShell ?? null,
    packageManagers,
    runtimes,
    environmentVariables,
    importantPaths,
    rawScan: input.rawScan ?? input.raw_scan ?? input
  };
}

export function validateEnvironmentProfile(input) {
  const profile = normalizeEnvironmentProfile(input);
  const errors = [];
  const warnings = [];

  if (!profile.os.name) {
    errors.push("os.name is required");
  }

  if (!profile.os.version) {
    warnings.push("os.version is missing; OS-specific commands may need confirmation.");
  }

  if (!profile.hardware.cpu.model) {
    warnings.push("hardware.cpu.model is missing; performance recommendations will be less precise.");
  }

  if (!profile.hardware.gpu.vendor && !profile.hardware.gpu.model) {
    warnings.push("GPU details are missing; guide will include CPU-only fallback or ask for GPU details.");
  }

  if (!profile.hardware.ramGb) {
    warnings.push("RAM amount is missing; memory allocation steps may need confirmation.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    profile
  };
}

function normalizeOs(source) {
  return {
    name: source.osName ?? source.os_name ?? source.name ?? null,
    version: source.osVersion ?? source.os_version ?? source.version ?? null,
    arch: source.osArch ?? source.os_arch ?? source.arch ?? null,
    defaultShell: source.defaultShell ?? source.default_shell ?? null
  };
}

function normalizeHardware(source) {
  return {
    cpu: {
      model: source.cpuModel ?? source.cpu_model ?? source.cpu?.model ?? null,
      cores: toNullableNumber(source.cpuCores ?? source.cpu_cores ?? source.cpu?.cores)
    },
    memory: {
      ramGb: toNullableNumber(source.ramGb ?? source.ram_gb ?? source.ramGB ?? source.memory?.ramGb)
    },
    ramGb: toNullableNumber(source.ramGb ?? source.ram_gb ?? source.ramGB ?? source.memory?.ramGb),
    gpu: {
      vendor: source.gpuVendor ?? source.gpu_vendor ?? source.gpu?.vendor ?? null,
      model: source.gpuModel ?? source.gpu_model ?? source.gpu?.model ?? null,
      vramGb: toNullableNumber(source.gpuVramGb ?? source.gpu_vram_gb ?? source.gpu?.vramGb),
      driverVersion:
        source.gpuDriverVersion ?? source.gpu_driver_version ?? source.gpu?.driverVersion ?? null,
      cudaVersion: source.cudaVersion ?? source.cuda_version ?? source.gpu?.cudaVersion ?? null,
      rocmVersion: source.rocmVersion ?? source.rocm_version ?? source.gpu?.rocmVersion ?? null
    }
  };
}

function normalizeArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function normalizeRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
