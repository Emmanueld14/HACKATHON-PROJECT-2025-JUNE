import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createMemoryStore } from "../services/store.js";
import { createWorkflowService } from "../services/workflowService.js";

const ROOT_DIR = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const HOME_DIR = join(ROOT_DIR, "Hackathon_project_HomePage");
const GAME_DIR = join(ROOT_DIR, "Hackathon-project-number-1-main", "test 1");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export function createApp({ store = createMemoryStore() } = {}) {
  const workflowService = createWorkflowService(store);

  return async function app(req, res) {
    try {
      const url = new URL(req.url, "http://localhost");

      if (req.method === "OPTIONS") {
        writeCors(res);
        res.writeHead(204);
        res.end();
        return;
      }

      if (url.pathname === "/health") {
        sendJson(res, 200, { ok: true, service: "lastresort-ai" });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/environment-profiles") {
        const body = await readJson(req);
        const environmentProfile = workflowService.createEnvironmentProfile(body);
        sendJson(res, 201, { environmentProfile });
        return;
      }

      if (req.method === "POST" && url.pathname === "/api/workflow-runs") {
        const body = await readJson(req);
        const result = workflowService.createWorkflowRun(body);
        sendJson(res, 201, result);
        return;
      }

      const workflowMatch = url.pathname.match(/^\/api\/workflow-runs\/([^/]+)$/);
      if (req.method === "GET" && workflowMatch) {
        const workflowRun = workflowService.getWorkflowRun(workflowMatch[1]);
        sendJson(res, 200, { workflowRun });
        return;
      }

      const diagnosticMatch = url.pathname.match(/^\/api\/workflow-runs\/([^/]+)\/errors$/);
      if (req.method === "POST" && diagnosticMatch) {
        const body = await readJson(req);
        const result = workflowService.createDiagnosticPatch({
          ...body,
          workflowRunId: diagnosticMatch[1]
        });
        sendJson(res, 201, result);
        return;
      }

      if (req.method === "GET") {
        const served = await serveStatic(url.pathname, res);
        if (served) {
          return;
        }
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      const statusCode = error.statusCode ?? 500;
      sendJson(res, statusCode, {
        error: error.message,
        details: error.details ?? undefined
      });
    }
  };
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Request body must be valid JSON");
    error.statusCode = 400;
    throw error;
  }
}

function sendJson(res, statusCode, payload) {
  writeCors(res);
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function writeCors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

async function serveStatic(pathname, res) {
  const candidates = getStaticCandidates(pathname);

  for (const candidate of candidates) {
    const safePath = resolve(candidate.root, normalize(candidate.relativePath).replace(/^(\.\.[/\\])+/, ""));
    if (!safePath.startsWith(candidate.root)) {
      continue;
    }

    try {
      const fileStat = await stat(safePath);
      if (!fileStat.isFile()) {
        continue;
      }

      const extension = extname(safePath);
      res.writeHead(200, {
        "content-type": MIME_TYPES[extension] ?? "application/octet-stream",
        "content-length": fileStat.size
      });
      createReadStream(safePath).pipe(res);
      return true;
    } catch {
      continue;
    }
  }

  return false;
}

function getStaticCandidates(pathname) {
  if (pathname === "/" || pathname === "/index.html") {
    return [{ root: HOME_DIR, relativePath: "Webpage.html" }];
  }

  if (pathname === "/games" || pathname === "/games/") {
    return [{ root: GAME_DIR, relativePath: "index.html" }];
  }

  if (pathname.startsWith("/games/")) {
    return [{ root: GAME_DIR, relativePath: pathname.replace("/games/", "") }];
  }

  return [{ root: HOME_DIR, relativePath: pathname.slice(1) }];
}

export async function renderReadmeApiExample() {
  return readFile(join(ROOT_DIR, "docs", "api-example.json"), "utf8");
}
