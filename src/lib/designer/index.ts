// Nullkode Designer — cloud port of Open CoDesign (MIT, OpenCoworkAI).
//
// This directory replaces apps/desktop/src/main/*.ts from the upstream repo.
// Where the desktop app held state in local SQLite + filesystem + keychain,
// we hold it in Postgres via Prisma. The renderer in apps/designer-renderer
// is unchanged — it sees the same window.codesign API surface, served by
// /api/designer/ipc/* instead of Electron IPC.
//
// See LICENSE-THIRD-PARTY for the upstream MIT notice.
export {};
