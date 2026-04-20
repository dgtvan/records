import { execFileSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const ports = Array.from(
  new Set([
    Number(process.env.DEV_WEB_PORT || 5173),
    Number(process.env.DEV_AUTH_PORT || 5174),
  ].filter((value) => Number.isInteger(value) && value > 0)),
);

function run(command, args) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function getPidsForPortWindows(port) {
  const output = run("netstat", ["-ano", "-p", "tcp"]);
  const pids = new Set();

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("TCP")) {
      continue;
    }

    const columns = trimmed.split(/\s+/);
    if (columns.length < 5) {
      continue;
    }

    const localAddress = columns[1];
    const state = columns[3];
    const pid = Number(columns[4]);
    if (!localAddress.endsWith(`:${port}`) || state !== "LISTENING" || !Number.isInteger(pid) || pid <= 0) {
      continue;
    }

    pids.add(pid);
  }

  return [...pids];
}

function getPidsForPortUnix(port) {
  try {
    const output = run("lsof", ["-ti", `tcp:${port}`]);
    return output
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
}

function killPid(pid) {
  if (process.platform === "win32") {
    run("taskkill", ["/PID", String(pid), "/F"]);
    return;
  }

  process.kill(pid, "SIGTERM");
}

function getPidsForPort(port) {
  return process.platform === "win32" ? getPidsForPortWindows(port) : getPidsForPortUnix(port);
}

const killed = [];

for (const port of ports) {
  for (const pid of getPidsForPort(port)) {
    try {
      killPid(pid);
      killed.push({ port, pid });
    } catch {
      // Ignore races where a process exits between detection and termination.
    }
  }
}

if (killed.length === 0) {
  console.log(`No existing listeners found on dev ports: ${ports.join(", ")}`);
} else {
  for (const entry of killed) {
    console.log(`Stopped process ${entry.pid} on port ${entry.port}`);
  }
}