// Codex (ChatGPT Plus subscription) OAuth — backs window.codesign.codexOAuth.*
//
// Upstream desktop implements full PKCE flow against
// https://auth.openai.com. The cloud port stubs this until we wire a Next.js
// OAuth callback route. status() returns logged_out, login() returns the
// same. The UI displays a "not connected" state.

import { db } from "../db";

export interface CodexOAuthStatus {
  schemaVersion: 1;
  status: "logged_out" | "pending" | "logged_in";
  accountType: string | null;
  email: string | null;
  expiresAt: string | null;
}

export async function getStatus(userId: string): Promise<CodexOAuthStatus> {
  const row = await db.designerCodexOAuth.findUnique({ where: { userId } });
  if (!row) {
    return {
      schemaVersion: 1,
      status: "logged_out",
      accountType: null,
      email: null,
      expiresAt: null,
    };
  }
  return {
    schemaVersion: 1,
    status: row.status as CodexOAuthStatus["status"],
    accountType: row.accountType,
    email: row.email,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
  };
}

export async function login(userId: string): Promise<CodexOAuthStatus> {
  await db.designerCodexOAuth.upsert({
    where: { userId },
    create: { userId, status: "logged_out" },
    update: { status: "logged_out" },
  });
  return getStatus(userId);
}

export async function cancelLogin(userId: string): Promise<boolean> {
  const row = await db.designerCodexOAuth.findUnique({ where: { userId } });
  if (!row || row.status !== "pending") return false;
  await db.designerCodexOAuth.update({
    where: { userId },
    data: { status: "logged_out", pkceVerifier: null },
  });
  return true;
}

export async function logout(userId: string): Promise<CodexOAuthStatus> {
  await db.designerCodexOAuth.deleteMany({ where: { userId } });
  return getStatus(userId);
}
