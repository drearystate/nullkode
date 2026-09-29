import { cookies } from "next/headers";
import type { Project } from "@prisma/client";
import { PlatformStylesheets } from "@/lib/public-page";
import { sessionCookieName, verifyAppSession } from "@/lib/flow/session";
import { findAccount } from "@/lib/app-account-data";
import { maskEmail, verifyDeletionToken } from "@/lib/app-account-token";
import { DeleteAccountForms } from "./delete-account-forms";

// Works with or without the app's theme (Designer apps load no platform CSS).
const CSS = `
.nk-da{max-width:40rem;margin:0 auto;padding:clamp(1.5rem,5vw,3.5rem) 1.25rem 4rem;color:var(--nk-text,#111827);font-family:var(--nk-font,system-ui,-apple-system,"Segoe UI",sans-serif);line-height:1.55}
.nk-da-top{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-bottom:2rem}
.nk-da-top a{color:inherit;font-weight:700;text-decoration:none}
.nk-da h1{font-size:clamp(1.6rem,4vw,2.2rem);font-weight:700;line-height:1.2;margin:0 0 .6rem}
.nk-da h2{font-size:1.15rem;font-weight:700;margin:0 0 .4rem}
.nk-da ul{margin:.75rem 0 0;padding-left:1.2rem}
.nk-da li{margin:.25rem 0}
.nk-da-muted{color:var(--nk-text-muted,#4b5563)}
.nk-da-card{border:1px solid var(--nk-border,#e5e7eb);border-radius:var(--nk-radius,14px);padding:1.25rem;margin:1.25rem 0 0;background:var(--nk-surface,#fff)}
.nk-da label{display:block;font-weight:600;font-size:.92rem;margin:.9rem 0 .3rem}
.nk-da input{display:block;width:100%;box-sizing:border-box;padding:.65rem .8rem;border:1px solid var(--nk-border,#d1d5db);border-radius:var(--nk-radius-sm,10px);font:inherit;background:var(--nk-bg,#fff);color:inherit}
.nk-da input:focus-visible,.nk-da-button:focus-visible{outline:3px solid var(--nk-primary,#4f46e5);outline-offset:2px}
.nk-da-button{display:inline-block;margin-top:1rem;padding:.65rem 1.1rem;border-radius:var(--nk-radius-sm,10px);border:1px solid transparent;font:inherit;font-weight:600;cursor:pointer;text-decoration:none;background:var(--nk-primary,#4f46e5);color:var(--nk-on-primary,#fff)}
.nk-da-button[disabled]{opacity:.6;cursor:default}
.nk-da-secondary{background:transparent;color:var(--nk-text,#111827);border-color:var(--nk-border,#d1d5db)}
.nk-da-danger{background:#b91c1c;color:#fff}
.nk-da-alert{color:#b91c1c;font-weight:600;margin:.75rem 0 0}
`;

/**
 * An app's public "Delete your account" page, at <app>/delete-account.
 * Stores need this address: Google Play asks for a web page where people can
 * ask for their account to be deleted, and Apple asks for deletion inside
 * the app. Signed-in visitors can download their data or delete the account
 * here; anyone else can ask by email.
 */
export async function AppDeleteAccountPage({ project, base, token }: { project: Project; base: string; token: string | null }) {
  const session = await verifyAppSession(project.id, (await cookies()).get(sessionCookieName())?.value);
  let signedIn: { email: string } | null = null;
  if (session && !session.owner) {
    const account = await findAccount(project.id, session.userId).catch(() => null);
    if (account) signedIn = { email: typeof account.email === "string" ? account.email : "" };
  }
  let link: { email: string } | { invalid: true } | null = null;
  if (token) {
    const claim = await verifyDeletionToken(token);
    link = claim && claim.projectId === project.id ? { email: maskEmail(claim.email) } : { invalid: true };
  }

  return (
    <>
      <PlatformStylesheets designerApp={project.kind === "DESIGNER"} themeHref={`/api/projects/${project.id}/theme.css?live=1`} />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <main className="nk-da">
        <div className="nk-da-top">
          <a href={`${base}/`}>{project.name}</a>
        </div>
        <h1>Delete your account</h1>
        <p className="nk-da-muted">You can delete your {project.name} account and the information tied to it at any time. Here&apos;s what happens:</p>
        <ul className="nk-da-muted">
          <li>Your account and sign-in are deleted.</li>
          <li>Everything you added while signed in, like your profile, saved items and posts, is deleted.</li>
          <li>Bookings, orders or messages sent with your email address are kept for the business&apos;s records, with your name and contact details removed.</li>
        </ul>
        <DeleteAccountForms
          projectId={project.id}
          base={base}
          appName={project.name}
          signedIn={signedIn}
          ownerSession={Boolean(session?.owner)}
          link={link}
          token={token}
        />
      </main>
    </>
  );
}
