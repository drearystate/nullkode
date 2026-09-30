import type { ModuleDefinition } from "../types";

/**
 * User Profile Card — a slim module that requires auth-users.
 *
 * Shows a public profile for the currently logged-in user. Uses the
 * {{@auth-users.table}} capability reference to query whichever table
 * is provided by the installed auth module. Demonstrates reading rows
 * from another module's table via the capability-resolution layer.
 */
export const userProfileCard: ModuleDefinition = {
  id: "user-profile-card",
  name: "Profile Card",
  tagline: "Public profile widget for the logged-in user",
  description:
    "A small profile card that shows the logged-in user's name, avatar and bio. Uses whichever auth-users module is installed — no database of its own. Drop it on a page to give visitors a quick sense of who's signed in.",
  icon: "",
  color: "from-cyan-500 to-sky-600",
  category: "community",
  version: "1.0.0",
  requires: ["auth-session", "auth-users"],
  worksWith: ["auth", "food-truck-finder"],

  tables: [],

  flows: [
    {
      slug: "me",
      name: "Get current profile",
      httpMethod: "POST",
      nodes: [
        { id: "n1", type: "trigger", data: {} },
        { id: "n2", type: "get_session", data: { output: "session" } },
        {
          id: "n3",
          type: "query",
          data: {
            // Capability ref — installer rewrites to the real table name
            // (e.g. "auth_users") from whichever module provides auth-users.
            table: "{{@auth-users.table}}",
            where: { id: "{{vars.session.userId}}" },
            limit: 1,
            output: "me",
          },
        },
        { id: "n4", type: "response", data: { status: 200, body: "{{vars.me.0}}" } },
      ],
      edges: [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
        { id: "e3", source: "n3", target: "n4" },
      ],
    },
  ],

  pages: [
    {
      slug: "me",
      title: "Me",
      html: `<!--nk:require-auth-->
<section class="py-5"><div class="container" style="max-width:480px;">
<div data-nk-bind-flow-ref="me" class="card p-4 shadow-sm text-center">
  <div data-nk-item>
    <img class="rounded-circle mx-auto mb-3" style="width:112px;height:112px;object-fit:cover;" data-nk-src="avatar_url" src="/media/generated/thumbs/people-priya.webp" alt=""/>
    <h2 class="fw-bold mb-0" data-nk-field="name">Your name</h2>
    <div style="color:var(--nk-text-muted);" data-nk-field="email">you@example.com</div>
    <p class="mt-3 mb-0" style="color:var(--nk-text-muted);" data-nk-field="bio">Your bio goes here. Edit it on the profile page.</p>
  </div>
</div>
<div class="text-center mt-3"><a class="btn btn-outline-secondary btn-sm" href="#" data-nk-logout-ref="logout" data-nk-redirect="/">Log out</a></div>
</div></section>`,
    },
  ],
};
