import { getTranslations } from "next-intl/server";
import { BellRing } from "lucide-react";
import { getRealUser } from "@/lib/auth";

/** Phones can be sent notifications: the operator set the Expo project (lib/native/compile.ts, lib/push.ts). */
export function phonePushReady(): boolean {
  return Boolean((process.env.NK_EXPO_PROJECT_ID ?? "").trim());
}

/**
 * Whether notifications reach the phone app (Mobile app tab, Notifications
 * page). Without the operator's Expo project the phone app can't register for
 * notifications: owners read that in plain words, administrators also read
 * what to set. Never shows the values themselves.
 */
export async function PhonePushNote({ className = "" }: { className?: string }) {
  const [t, real] = await Promise.all([getTranslations("nativeStudio.phonePush"), getRealUser()]);
  const ready = phonePushReady();
  return (
    <div className={`card p-5 text-sm ${ready ? "" : "border-amber-500/30"} ${className}`} data-nk-phone-push={ready ? "on" : "off"}>
      <p className="flex items-center gap-2 font-medium text-surface-100" data-help={t("help")}>
        <BellRing size={16} aria-hidden />
        {t("title")}
      </p>
      <p className="mt-1 text-surface-300">{ready ? t("on") : t("off")}</p>
      {!ready && real?.role === "ADMIN" && <p className="mt-2 text-xs leading-relaxed text-surface-400">{t("adminHow")}</p>}
    </div>
  );
}
