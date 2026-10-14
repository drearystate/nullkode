# Sharing: copies and working together

Any account (and a reseller's clients, within their reseller) can share an app, an AI Designer design or a game in two ways. The code is in `src/lib/sharing`; the screens are the **Share** button (project tabs, Designer, Game Studio), `/share/<token>`, `/invites/<token>` and **Shared with me** on the dashboard.

## Share a copy

The owner makes a link (`ShareLink`: revocable, optional end date, "include sample data" for apps). Whoever opens it signs in or signs up, sees a card (name, picture, what's included) and presses **Make my copy**; the copy is created in their account by `makeCopy` (`src/lib/sharing/links.ts` → `copy.ts`) and recorded in `ShareCopy` (the sharer's "Copies" list and the "Copied from …" credit the new owner can hide). Nothing links the copy to the original afterwards.

An app made from a design or a game (a `DESIGNER` project) is shared as that design or game.

| | A copy includes | A copy never includes |
|---|---|---|
| App | pages and their translations, the app's languages, flows (new ids, pages rewired), table structure, theme, icon, installed features' settings, the phone app's look (name, colours, orientation, permission wording); sample rows only when ticked | AI keys (`AppAiConnection`), private feature settings and the copies of them in flow steps (blanked like the backup download, `lib/export-secrets.ts`), outside-database connections (kept by name, config emptied), Android signing keys, store releases and F-Droid entries, the bundle id / Apple team / Play signing hash, custom domains and `hostLabel`, push subscribers, deployments (the copy starts unpublished), flow runs, settings keyed by the app (SEO verification, alerts, privacy requests, AI notices) |
| Design | every file, like **Duplicate** (it gets its own app on its first build) | chat, versions, builds, its app |
| Game | current files; the plan (brief, art direction, assets, content and phases, brand, the feature list with every feature `built` and no old test results); one starting version with the newest screenshot | chat, notes, jobs, feature history, earlier versions, its published app |

**Sample rows** come only from tables the app's public pages show (read by an enabled, public flow that doesn't depend on who is signed in), never from a table any non-staff flow writes to (form submissions, sign-ups, comments, orders, webhook deliveries), never from sign-in/account tables or tables with password/hash/secret/token columns, never a row a signed-in visitor made (`created_by` set to someone other than the owner); email, phone, address and IP columns and links to app accounts are emptied. At most 500 rows per table. Files the pages and rows use stay where they are (uploads are shared between apps and are never deleted with an app), so they are referenced, not duplicated.

A copy goes through the normal steps: the recipient's plan and reseller app limits (under the same lock as transfers), a fresh slug, `syncProjectNav`, and rollback with `eraseProject` if anything fails. An app with AI steps shows the usual "add your AI key" banner, since keys never travel.

**Workspaces:** a link works for people in the sharer's workspace: a reseller's clients (and the reseller) share with each other, the platform's own customers with each other; the operator's links work for everyone (`sameWorkspace`, same rule as transfers).

## Edit together (collaborators)

The owner invites people by email as **editor** or **viewer** (`Collaborator`, status `pending` → `active`). The invitation is emailed (when email is set up) and the link is also shown to the owner. Accepting requires being signed in as the invited address and proving it: the emailed link's token, or an account that existed before the invitation or has a verified address (signing up doesn't verify addresses). The invitee must be in the owner's workspace (as above). Pending invitations also show in **Shared with me**.

Access goes through one helper, `src/lib/sharing/access.ts` (`ownedProject(id, need)` in `lib/guard.ts`, `hasProjectAccess`, `roleOn`, and `gameWithRole` / `designWithRole` behind the Game Studio and Designer stores). `need` is `view`, `edit` or `owner`; strangers get 404, collaborators without the role 403. Nothing is cached, so removing a collaborator ends access on the next request (play and preview passes included).

| | Owner | Editor | Viewer |
|---|---|---|---|
| Open the studio, preview, read pages, flows, theme, features | yes | yes | yes |
| Edit pages, flows, data rows, theme, name, icon, add features, languages; AI builds and edits (charged to the editor's own AI allowance) | yes | yes | no |
| Data tab (rows are people's data), flow runs, phone preview / emulator / Expo Go | yes | yes | no |
| Game and design builds, changes, restores, branding, features | yes | yes | no |
| Delete, transfer, publish, unpublish, roll back; AI keys, domains, SEO, alerts, app admins, privacy requests, push; phone-app settings, builds, signing key, store publishing; backup and offline download; Share dialog and invitations | yes | no | no |

Collaborators see flows with the owner's private keys blanked; when an editor saves a flow, every blank they didn't change gets its real value back (`lib/sharing/redact.ts`). Editors can't enter private feature settings or connect outside databases. Plan limits (pages, scheduled flows) are the owner's; AI actions are the person's who runs them.

**Concurrent editing:** last save wins. The page editor sends `baseUpdatedAt`; when someone else saved the page since, the save answers `otherSave` and the editor shows a warning with **Reload**. Game builds already run one at a time per game, Designer builds one at a time per design.

**Audit:** while something has collaborators, `EditLog` records page saves (coalesced per person and page for 5 minutes), page and flow creates/deletes, flow saves, data changes, features added, theme/name changes, game and design versions (with who started the build), and invitations, joins, role changes and removals. The Share dialog shows **Recent changes**; rows are kept 180 days.

## API

Studio: `GET/POST /api/share`, `DELETE /api/share/links/{id}`, `GET /api/share/open/{token}`, `POST /api/share/open/{token}/copy`, `GET /api/share/open/{token}/shot`, `GET/POST /api/share/collaborators`, `PATCH/DELETE /api/share/collaborators/{id}`, `POST /api/share/leave`, `POST /api/share/credit`, `GET /api/share/edits`, `GET /api/me/shared`, `GET /api/me/invites`, `POST /api/me/invites/{id|token}`.

Partner API (`build` permission, docs/partner-api.md "Sharing"): `POST/GET /shares`, `DELETE /shares/{linkId}`, `POST /copies` (`{userId, token}` or `{userId, kind, id, includeData?}`).

Tables: `ShareLink`, `ShareCopy`, `Collaborator`, `EditLog` (additive). Tests: `scripts/e2e-sharing.ts`.
