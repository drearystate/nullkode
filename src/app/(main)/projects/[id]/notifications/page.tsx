import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { subscriberCount } from "@/lib/push";
import { NotificationComposer } from "@/components/notification-composer";
import { EnablePushButton } from "@/components/enable-push-button";
import { PhonePushNote } from "@/components/phone-push-note";

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
  const [t, format] = await Promise.all([getTranslations("project.notificationsPage"), getFormatter()]);
  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="studio-eyebrow mb-3 text-brand-300">{t("eyebrow")}</p>
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-1 text-sm text-surface-400">{t("intro", { name: project.name })}</p>

      {!installed ? (
        <div className="card mt-6 p-6 text-sm">
          <p className="font-medium">{t("offTitle")}</p>
          <p className="mt-1 text-surface-400">{t("offBody")}</p>
          <EnablePushButton projectId={id} />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card p-5" data-help={t("subscribersHelp")}><p className="text-xs uppercase tracking-wider text-surface-400">{t("subscribers")}</p><p className="mt-2 text-3xl font-semibold tabular-nums">{format.number(subscribers)}</p></div>
            <div className="card p-5 text-sm text-surface-300"><p className="font-medium text-surface-100">{t("goodToKnow")}</p><p className="mt-1 text-xs leading-relaxed text-surface-400">{t("iosTip")}</p></div>
          </div>
          <PhonePushNote className="mt-4" />
          <NotificationComposer projectId={id} published={project.published} subscribers={subscribers} />
          <section className="mt-8" aria-labelledby="sent-heading">
            <h2 id="sent-heading" className="font-semibold" data-help={t("sentHelp")}>{t("sent")}</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-surface-400">{t("nothingSent")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {history.map((m) => (
                  <li key={m.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <span className="min-w-0"><span className="block truncate font-medium">{m.title}</span>{m.body && <span className="block truncate text-xs text-surface-400">{m.body}</span>}</span>
                    <span className="shrink-0 text-xs text-surface-400">{t("stats", { sent: m.sent, failed: m.failed ?? 0, removed: m.removed ?? 0, date: format.dateTime(m.createdAt, { dateStyle: "medium", timeStyle: "short" }) })}</span>
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
