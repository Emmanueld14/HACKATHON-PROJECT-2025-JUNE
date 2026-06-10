const form = document.querySelector("[data-workflow-form]");
const result = document.querySelector("[data-workflow-result]");
const categoryButtons = document.querySelectorAll("[data-domain]");

const defaultProfiles = {
  windows: {
    profileName: "Windows gaming/editing rig",
    os: { name: "Windows", version: "11", arch: "x64", defaultShell: "PowerShell" },
    hardware: {
      cpu: { model: "Unknown", cores: 8 },
      ramGb: 16,
      gpu: { vendor: "NVIDIA", model: "Unknown RTX/GTX", driverVersion: "Unknown" }
    },
    packageManagers: ["winget"],
    runtimes: {},
    environmentVariables: {},
    importantPaths: {
      userProfile: "C:\\Users\\<you>",
      appData: "C:\\Users\\<you>\\AppData\\Roaming"
    }
  },
  macos: {
    profileName: "macOS creator machine",
    os: { name: "macOS", version: "Unknown", arch: "arm64/x64", defaultShell: "zsh" },
    hardware: {
      cpu: { model: "Apple Silicon or Intel", cores: null },
      ramGb: 16,
      gpu: { vendor: "Apple/AMD/Intel", model: "Unknown", driverVersion: "Bundled" }
    },
    packageManagers: ["homebrew"],
    runtimes: {},
    environmentVariables: {},
    importantPaths: {
      home: "/Users/<you>",
      zshrc: "/Users/<you>/.zshrc"
    }
  },
  linux: {
    profileName: "Linux workstation",
    os: { name: "Linux", version: "Unknown distro", arch: "x64", defaultShell: "bash" },
    hardware: {
      cpu: { model: "Unknown", cores: 8 },
      ramGb: 16,
      gpu: { vendor: "NVIDIA/AMD/Intel", model: "Unknown", driverVersion: "Unknown" }
    },
    packageManagers: ["apt", "flatpak"],
    runtimes: {},
    environmentVariables: {},
    importantPaths: {
      home: "/home/<you>",
      bashrc: "/home/<you>/.bashrc"
    }
  }
};

let selectedDomain = "games";

categoryButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedDomain = button.dataset.domain;
    categoryButtons.forEach((item) => item.classList.remove("selected-domain"));
    button.classList.add("selected-domain");
  });
});

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setResult("Generating an advanced prompt request...", "loading");

    const formData = new FormData(form);
    const profilePreset = formData.get("profilePreset") || "windows";
    const customProfile = formData.get("environmentProfile")?.toString().trim();

    let environmentProfile = defaultProfiles[profilePreset] ?? defaultProfiles.windows;

    if (customProfile) {
      try {
        environmentProfile = JSON.parse(customProfile);
      } catch (error) {
        setResult(`Environment profile JSON is invalid: ${error.message}`, "error");
        return;
      }
    }

    const body = {
      domain: selectedDomain,
      goal: formData.get("goal"),
      environmentProfile,
      controlFilters: {
        launchers: formData.get("launchers") === "on",
        performance: formData.get("performance") === "on",
        essentials: formData.get("essentials") === "on",
        environment: formData.get("environment") === "on",
        cheats: formData.get("cheats") === "on"
      },
      retrievedContext: [
        {
          title: "MVP placeholder for official docs/RAG chunks",
          url: null,
          trustLevel: "placeholder",
          excerpt:
            "Replace this placeholder with retrieved official documentation, GitHub README chunks, and trusted domain wiki excerpts."
        }
      ]
    };

    try {
      const response = await fetch("/api/workflow-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Workflow request failed");
      }

      setResult(JSON.stringify(data.promptRequest, null, 2), "success");
    } catch (error) {
      setResult(error.message, "error");
    }
  });
}

function setResult(message, state) {
  if (!result) {
    return;
  }

  result.textContent = message;
  result.dataset.state = state;
}
