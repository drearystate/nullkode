import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { subscriberCount } from "@/lib/push";
import { NotificationComposer } from "@/components/notification-composer";
import { EnablePushButton } from "@/components/enable-push-button";

export const dynamic = "force-dynamic";

export default async function NotificationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;
  const project = await db.project.findUnique({ where: { id }, select: { id: true, ownerId: true, name: true, published: true } });
  if (!project || project.ownerId !== user.id) notFound();
  const [installed, subscribers, history] = await Promise.all([
    db.projectModule.findFirst({ where: { projectId: id, moduleId: "push-notifications" }, select: { id: true } }),
    subscriberCount(id).catch(() => 0),
    db.pushMessage.findMany({ where: { projectId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">STAY IN TOUCH</p>
      <h1 className="text-3xl font-semibold tracking-tight">Push notifications</h1>
      <p className="mt-1 text-sm text-surface-400">Send a message straight to the phones and computers of people who turned on notifications for {project.name}.</p>

      {!installed ? (
        <div className="card mt-6 p-6 text-sm">
          <p className="font-medium">Notifications are off for this app.</p>
          <p className="mt-1 text-surface-400">Turning them on adds a small &ldquo;Get notified&rdquo; page your visitors can use to sign up. Then you can send them news, offers and reminders from here.</p>
          <EnablePushButton projectId={id} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card p-5" data-help="How many phones and computers have turned on notifications for your app. Someone using two devices counts twice."><p className="text-xs uppercase tracking-wider text-surface-400">Subscribers</p><p className="mt-2 text-3xl font-semibold tabular-nums">{subscribers.toLocaleString("en-US")}</p></div>
            <div className="card p-5 text-sm text-surface-300"><p className="font-medium text-surface-100">Good to know</p><p className="mt-1 text-xs leading-relaxed text-surface-400">On iPhone and iPad, people first add your app to their home screen (Share → Add to Home Screen), then turn on notifications there. Android and computers work from the browser.</p></div>
          </div>
          <NotificationComposer projectId={id} published={project.published} subscribers={subscribers} />
          <section className="mt-8" aria-labelledby="sent-heading">
            <h2 id="sent-heading" className="font-semibold" data-help="Notifications you’ve sent, newest first, with how many devices got each one.">Sent</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-surface-400">Nothing sent yet.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((m) => (
                  <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <span className="min-w-0"><span className="block truncate font-medium">{m.title}</span>{m.body && <span className="block truncate text-xs text-surface-400">{m.body}</span>}</span>
                    <span className="shrink-0 text-xs text-surface-400">{m.sent} delivered{m.failed ? ` · ${m.failed} failed` : ""}{m.removed ? ` · ${m.removed} unsubscribed` : ""} · {m.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
