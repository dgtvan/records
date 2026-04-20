import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

const DEV_AUTH_PORT = Number(process.env.DEV_AUTH_PORT || 5174);
const DEV_AUTH_HOST = process.env.DEV_AUTH_HOST || "localhost";
const DEV_AUTH_PUBLIC_ORIGIN = process.env.DEV_AUTH_PUBLIC_ORIGIN || `http://${DEV_AUTH_HOST}:${DEV_AUTH_PORT}`;
const CLIENT_ID = process.env.DEV_GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.DEV_GOOGLE_CLIENT_SECRET;
const TOKEN_STORE_PATH = resolve(process.cwd(), process.env.DEV_GOOGLE_TOKEN_STORE_PATH || ".dev-google-auth.json");
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USER_INFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const DEV_WEB_ORIGIN = process.env.DEV_WEB_ORIGIN || "http://localhost:5173";

let pendingLoginState = null;

function getRedirectUri() {
  return `${DEV_AUTH_PUBLIC_ORIGIN}/api/dev-auth/callback`;
}

function readStoredTokens() {
  if (!existsSync(TOKEN_STORE_PATH)) {
    return null;
  }

  try {
    const raw = readFileSync(TOKEN_STORE_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredTokens(tokens) {
  writeFileSync(TOKEN_STORE_PATH, `${JSON.stringify(tokens, null, 2)}\n`, "utf8");
}

function clearStoredTokens() {
  if (existsSync(TOKEN_STORE_PATH)) {
    unlinkSync(TOKEN_STORE_PATH);
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, message) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(message);
}

function validateConfig() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing local auth configuration. Set DEV_GOOGLE_CLIENT_ID and DEV_GOOGLE_CLIENT_SECRET in .env.local.",
    );
  }
}

async function mintAccessToken() {
  validateConfig();
  const storedTokens = readStoredTokens();

  if (!storedTokens?.refreshToken) {
    throw new Error("Local development auth is not initialized. Click Sign in once to complete the local Google consent flow.");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: storedTokens.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Google token exchange failed.");
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("Google token exchange did not return an access token.");
  }

  if (payload.refresh_token && payload.refresh_token !== storedTokens.refreshToken) {
    writeStoredTokens({
      ...storedTokens,
      refreshToken: payload.refresh_token,
    });
  }

  return payload;
}

async function exchangeAuthorizationCode(code) {
  validateConfig();

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Google authorization code exchange failed.");
  }

  const payload = await response.json();
  if (!payload.refresh_token) {
    throw new Error("Google did not return a refresh token. Revoke the app in your Google account and try again.");
  }

  const userEmail = payload.access_token ? await fetchUserEmail(payload.access_token) : undefined;
  writeStoredTokens({
    refreshToken: payload.refresh_token,
    userEmail,
    createdAt: new Date().toISOString(),
  });

  return { userEmail };
}

async function fetchUserEmail(accessToken) {
  const response = await fetch(USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return undefined;
  }

  const payload = await response.json();
  return payload.email;
}

async function canReuseRunningServer() {
  try {
    const response = await fetch(`http://127.0.0.1:${DEV_AUTH_PORT}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "GET" && url.pathname === "/api/dev-auth/session") {
    try {
      const tokenPayload = await mintAccessToken();
      const userEmail = await fetchUserEmail(tokenPayload.access_token);

      sendJson(response, 200, {
        accessToken: tokenPayload.access_token,
        expiresAt: tokenPayload.expires_in ? Date.now() + tokenPayload.expires_in * 1000 : undefined,
        userEmail,
      });
    } catch (error) {
      sendText(response, 500, error instanceof Error ? error.message : "Local development auth server failed.");
    }

    return;
  }

  if (request.method === "GET" && url.pathname === "/api/dev-auth/login") {
    try {
      validateConfig();
      const state = randomUUID();
      pendingLoginState = {
        state,
        returnTo: url.searchParams.get("returnTo") || `${DEV_WEB_ORIGIN}/`,
      };

      const authUrl = new URL(AUTH_URL);
      authUrl.searchParams.set("client_id", CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", getRedirectUri());
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", DRIVE_SCOPE);
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("include_granted_scopes", "true");
      authUrl.searchParams.set("state", state);

      response.writeHead(302, { Location: authUrl.toString() });
      response.end();
    } catch (error) {
      sendText(response, 500, error instanceof Error ? error.message : "Could not start local development auth.");
    }

    return;
  }

  if (request.method === "GET" && url.pathname === "/api/dev-auth/callback") {
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const errorParam = url.searchParams.get("error");

    if (errorParam) {
      sendText(response, 400, `Google authorization failed: ${errorParam}`);
      return;
    }

    if (!pendingLoginState || !state || state !== pendingLoginState.state || !code) {
      sendText(response, 400, "Local development auth callback state was invalid or expired.");
      return;
    }

    try {
      const { userEmail } = await exchangeAuthorizationCode(code);
      const returnTo = pendingLoginState.returnTo;
      pendingLoginState = null;

      const destination = new URL(returnTo);
      if (userEmail) {
        destination.searchParams.set("devAuthEmail", userEmail);
      }

      response.writeHead(302, { Location: destination.toString() });
      response.end();
    } catch (error) {
      pendingLoginState = null;
      sendText(response, 500, error instanceof Error ? error.message : "Could not complete local development auth.");
    }

    return;
  }

  if (request.method === "POST" && url.pathname === "/api/dev-auth/logout") {
    clearStoredTokens();
    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true, initialized: Boolean(readStoredTokens()?.refreshToken) });
    return;
  }

  sendText(response, 404, "Not found.");
});

server.on("error", async (error) => {
  if (error?.code === "EADDRINUSE" && (await canReuseRunningServer())) {
    console.log(`Local development auth server already running on http://127.0.0.1:${DEV_AUTH_PORT}`);
    console.log(`Google OAuth redirect URI: ${getRedirectUri()}`);
    process.stdin.resume();
    return;
  }

  throw error;
});

server.listen(DEV_AUTH_PORT, "127.0.0.1", () => {
  console.log(`Local development auth server listening on http://127.0.0.1:${DEV_AUTH_PORT}`);
  console.log(`Google OAuth redirect URI: ${getRedirectUri()}`);
});