import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { json, slugify, projectSlug } from "@/lib/utils";
import { getModule } from "@/lib/modules/registry";
import { installModule } from "@/lib/modules/install";
import { checkProjectLimit } from "@/lib/guard";

/** Escapes text for use inside HTML content or a quoted attribute. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A blank app's first page: something sensible for visitors to see (the
 * app's name, a welcome line, an about and a contact section), never tips
 * for the builder. Tips live in the editor instead.
 */
function starterHomeHtml(appName: string): string {
  const name = escapeHtml(appName);
  return `<section class="nk-hero text-center">
  <div class="container" style="max-width:760px;">
    <span class="nk-eyebrow">Welcome</span>
    <h1 class="display-3 fw-bold mb-3" style="letter-spacing:-0.025em;line-height:1.05;">${name}</h1>
    <p class="lead mb-4" style="color:var(--nk-text-muted);">Thanks for stopping by. We&rsquo;re glad you&rsquo;re here.</p>
    <div class="d-flex flex-wrap gap-3 justify-content-center">
      <a href="#contact" class="btn btn-primary btn-lg px-4">Get in touch</a>
      <a href="#about" class="btn btn-outline-primary btn-lg px-4">About us</a>
    </div>
  </div>
</section>
<section id="about" class="py-5">
  <div class="container" style="max-width:760px;">
    <h2 class="h2 fw-bold mb-3">About us</h2>
    <p class="mb-0" style="color:var(--nk-text-muted);">We&rsquo;re a friendly, local business. We care about doing a good job and looking after every customer.</p>
  </div>
</section>
<section id="contact" class="py-5" style="background:var(--nk-surface-2);">
  <div class="container" style="max-width:760px;">
    <h2 class="h2 fw-bold mb-3">Get in touch</h2>
    <p class="mb-0" style="color:var(--nk-text-muted);">Have a question? We&rsquo;d love to hear from you.</p>
  </div>
</section>`;
}

const CreateBody = z.object({
  name: z.string().min(1).max(80),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });
  const projects = await db.project.findMany({
    where: { ownerId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return json({ projects });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const limitError = await checkProjectLimit(user);
  if (limitError) return limitError;

  const parsed = CreateBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid input" }, { status: 400 });

  const base = slugify(parsed.data.name) || "project";
  const slug = projectSlug(base);

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      slug,
      ownerId: user.id,
      pages: {
        create: {
          slug: "home",
          title: "Home",
          isHome: true,
          html: starterHomeHtml(parsed.data.name),
          css: "",
        },
      },
    },
  });

  // Auto-install the auth module so login/register/forgot-password work
  // out of the box on every new project. Never fatal — if it fails, we
  // still return the project.
  try {
    const auth = getModule("auth");
    if (auth) {
      await installModule({ projectId: project.id, module: auth, allowUnmetRequirements: true });
    }
  } catch (err) {
    console.error("Auto-install auth failed:", err);
  }

  return json({ project });
}
