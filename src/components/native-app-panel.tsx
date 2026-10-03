"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, FileUp, KeyRound, MapPin, Mic, Package, ShieldCheck, Smartphone, Store, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { viewerTimeZone } from "@/components/data/format";
import {
  AppLinksCard,
  EmulatorCard,
  EngineBuildCard,
  ExpoGoCard,
  IosProjectCard,
  NativeAppPreview,
  SectionTitle,
  type EngineBuild,
} from "@/components/native-studio";
import { PhoneAppUpdate, type PhoneAppState } from "@/components/phone-app-update";

type WordingKey = "camera" | "microphone" | "photos" | "location";

type NativeConfig = {
  appId: string;
  appName: string;
  version: string;
  build: number;
  orientation: "default" | "portrait" | "landscape";
  backgroundColor: string;
  themeColor: string;
  androidEnabled: boolean;
  iosEnabled: boolean;
  /** The owner's own wording for the permission prompts ("" or missing: the suggested wording). */
  permissionText?: Partial<Record<WordingKey, string>>;
  /** Apple Team ID (iPhone links), "" or missing until entered. */
  iosTeamId?: string;
  playSigningSha256?: string;
};

type PhoneFeature = "camera" | "microphone" | "location" | "files";

/** What GET /api/projects/[id]/native says about the phone features the app uses. */
type PhoneInfo = {
  features: PhoneFeature[];
  sources: Partial<Record<PhoneFeature, Array<{ kind: "module" | "page"; label: string }>>>;
  suggested: Record<WordingKey, string>;
  texts: Record<WordingKey, string>;
  iosDownload: { at: string; features: string[] } | null;
};

/** Features that need the phone's permission, so a new store build when they change. */
const PERMISSION_FEATURES: PhoneFeature[] = ["camera", "microphone", "location"];
/** Builds before this version of the app shell can't open files, download or ask for permissions. */
const SHELL_VERSION = 2;

/** The panel's messages (project.json, under nativeApp). */
type T = ReturnType<typeof useTranslations>;

/** "camera", "camera and microphone", "camera, microphone and location" (at most the three permission features). */
function featureList(items: PhoneFeature[], t: T): string {
  const names = items.map((f) => t(`features.${f}.name`));
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return t("featureList.two", { a: names[0], b: names[1] });
  return t("featureList.three", { a: names[0], b: names[1], c: names.slice(2).join(", ") });
}

export type BuildKind = "debug" | "release";

export type BuildSummary = {
  buildId: string;
  kind?: BuildKind;
  status: "running" | "done" | "error";
  version: string;
  versionCode?: number;
  startedAt: string;
  finishedAt?: string;
  apkBytes?: number;
  filename?: string;
  files?: { aab?: { name: string; bytes: number }; apk?: { name: string; bytes: number } };
  signer?: string;
  error?: string;
  /** Phone features the build declared (missing on builds before phone features). */
  features?: string[];
  /** App shell version (missing on builds before phone features). */
  shell?: number;
  /** Set when the build couldn't use the app's icon and drew the default one: why, and what to do. */
  iconNote?: string;
};

/** Why a finished build needs redoing for the store, or null. */
function rebuildReason(build: BuildSummary | null, current: PhoneFeature[] | null, kind: BuildKind, t: T): string | null {
  if (!build || build.status !== "done" || !current) return null;
  const release = kind === "release";
  if (!build.shell || build.shell < SHELL_VERSION) {
    return t(release ? "rebuild.oldShellRelease" : "rebuild.oldShell");
  }
  const had = PERMISSION_FEATURES.filter((f) => (build.features ?? []).includes(f));
  const need = PERMISSION_FEATURES.filter((f) => current.includes(f));
  const added = need.filter((f) => !had.includes(f));
  const removed = had.filter((f) => !need.includes(f));
  if (added.length) return t(release ? "rebuild.addedRelease" : "rebuild.added", { features: featureList(added, t), count: added.length });
  if (removed.length) return t(release ? "rebuild.removedRelease" : "rebuild.removed", { features: featureList(removed, t), count: removed.length });
  return null;
}

export type UploadKeySummary = {
  alias: string;
  sha256: string;
  sha1: string;
  imported: boolean;
  createdAt: string;
  updatedAt: string;
  lastVersionCode: number;
  missing: boolean;
};

export function NativeAppPanel({
  projectId,
  initialConfig,
  published,
  liveUrl,
  android,
  isOperator,
  ownerActions,
  initialKey,
  initialBuilds,
  native,
}: {
  projectId: string;
  initialConfig: NativeConfig;
  published: boolean;
  liveUrl: string;
  /** Whether this server can build Android apps (classic WebView builds), and why not. */
  android: { ready: boolean; reason?: string };
  /** The signed-in person runs this server (sees installer tips). */
  isOperator: boolean;
  /** False while someone acts as the owner: the upload key stays owner-only. */
  ownerActions: boolean;
  initialKey: UploadKeySummary | null;
  /** Classic (WebView) builds. */
  initialBuilds: BuildSummary[];
  /** The native app (NullKode Native engine). */
  native: {
    /** The phone preview on the app's own address: engine page, spec, web address (lib/native/engine-web.ts). */
    engineUrl: string;
    appJsonUrl: string;
    webBase: string;
    webBuildReady: boolean;
    screenColor?: string;
    /** Whether this server can build native apps, and why not. */
    engine: { ready: boolean; reason?: string };
    /** The Android phone in the browser is set up on this server. */
    emulator: boolean;
    initialBuilds: EngineBuild[];
    spec: { state: PhoneAppState; deploymentId: string | null };
  };
}) {
  const [cfg, setCfg] = useState<NativeConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [key, setKey] = useState<UploadKeySummary | null>(initialKey);
  const [phone, setPhone] = useState<PhoneInfo | null>(null);
  const [engineBuilds, setEngineBuilds] = useState<EngineBuild[]>(native.initialBuilds);
  const t = useTranslations("project.nativeApp");
  const ts = useTranslations("nativeStudio");
  const tc = useTranslations("common");
  const format = useFormatter();

  const loadEngineBuilds = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/native/engine-build`).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (Array.isArray(data?.builds)) setEngineBuilds(data.builds as EngineBuild[]);
  }, [projectId]);

  // Phone features come from the app's modules and pages, worked out on the server.
  const loadPhone = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/native`).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data?.phone) setPhone(data.phone as PhoneInfo);
  }, [projectId]);
  useEffect(() => {
    void loadPhone();
  }, [loadPhone]);

  function set<K extends keyof NativeConfig>(k: K, value: NativeConfig[K]) {
    setCfg((c) => ({ ...c, [k]: value }));
    setStatus(null);
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/native`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("details.couldNotSave"));
      setCfg(data.config);
      setStatus({ kind: "ok", msg: tc("saved") });
      void loadPhone();
    } catch (e) {
      setStatus({ kind: "err", msg: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function refreshKey() {
    const res = await fetch(`/api/projects/${projectId}/native/keystore`).catch(() => null);
    const data = res?.ok ? await res.json().catch(() => null) : null;
    if (data) setKey(data.key ?? null);
  }

  const latest = (kind: BuildKind) => initialBuilds.find((b) => (b.kind ?? "debug") === kind) ?? null;
  const nextVersionCode = Math.max(Math.floor(cfg.build) || 1, (key?.lastVersionCode ?? 0) + 1);
  const canBuild = published && android.ready;
  const current = phone?.features ?? null;
  // The app's public page where people can delete their account (the stores ask for it).
  const deleteAccountUrl = `${liveUrl.replace(/\/$/, "")}/delete-account`;
  const iosLocationChange = (() => {
    if (!phone?.iosDownload || !current) return null;
    const had = phone.iosDownload.features.includes("location");
    const need = current.includes("location");
    if (had === need) return null;
    return need ? t("ios.locationAdded") : t("ios.locationRemoved");
  })();

  const engineReady = native.engine.ready;
  const debugBuilds = engineBuilds.filter((b) => b.kind === "debug");
  const releaseBuilds = engineBuilds.filter((b) => b.kind === "release");
  const hasTestApp = debugBuilds.some((b) => b.status === "done");

  return (
    <div className="space-y-8">
      {!published && (
        <div className="card p-5 border-amber-500/40 bg-amber-500/5">
          <div className="font-semibold text-amber-300">{t("notPublished.title")}</div>
          <p className="mt-1 text-sm text-surface-300">{t("notPublished.body")}</p>
          <Link href={`/projects/${projectId}/publish`} className="btn-primary mt-3 inline-flex" data-help={t("notPublished.goToPublishHelp")}>
            {t("notPublished.goToPublish")}
          </Link>
        </div>
      )}

      {published && (
        <div className="card p-4 text-sm">
          <span className="text-surface-400">{t("liveUrl.label")} </span>
          <a href={liveUrl} target="_blank" rel="noreferrer" dir="ltr" className="text-brand-400 hover:underline break-all" data-help={t("liveUrl.help")}>
            {liveUrl}
          </a>
          {liveUrl.startsWith("http://") && (
            <p className="mt-2 text-amber-300">{t("liveUrl.httpWarning")}</p>
          )}
          <PhoneAppUpdate
            className="mt-2"
            projectId={projectId}
            initial={native.spec.state}
            deploymentId={native.spec.deploymentId}
            labels={{ updating: ts("status.updating"), updated: ts("status.updated"), upToDate: ts("status.upToDate"), readyNote: ts("status.note") }}
          />
        </div>
      )}

      {/* ── 1. The native app, live ───────────────────────────────── */}
      <NativeAppPreview
        projectId={projectId}
        published={published}
        engineUrl={native.engineUrl}
        appJsonUrl={native.appJsonUrl}
        webBase={native.webBase}
        webBuildReady={native.webBuildReady}
        screenColor={native.screenColor}
      />

      {/* ── 2 and 3. On a phone, in the browser ──────────────────── */}
      <ExpoGoCard projectId={projectId} published={published} />
      {native.emulator && <EmulatorCard projectId={projectId} published={published} hasTestApp={hasTestApp} />}

      {/* ── App identity ──────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="font-semibold" data-help={t("details.titleHelp")}>{t("details.title")}</h2>
        <p className="mt-1 text-sm text-surface-400">{t("details.intro")}</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">{t("details.appName")}</label>
            <input
              className="input"
              value={cfg.appName}
              maxLength={30}
              aria-label={t("details.appName")}
              data-help={t("details.appNameHelp")}
              onChange={(e) => set("appName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("details.appId")}</label>
            <input
              className="input font-mono"
              value={cfg.appId}
              dir="ltr"
              aria-label={t("details.appId")}
              data-help={t("details.appIdHelp")}
              onChange={(e) => set("appId", e.target.value)}
              placeholder="com.company.app"
            />
            <p className="mt-1 text-xs text-surface-500">{t("details.appIdHint")}</p>
          </div>
          <div>
            <label className="label">{t("details.version")}</label>
            <input
              className="input font-mono"
              value={cfg.version}
              dir="ltr"
              aria-label={t("details.version")}
              data-help={t("details.versionHelp")}
              onChange={(e) => set("version", e.target.value)}
              placeholder="1.0.0"
            />
          </div>
          <div>
            <label className="label">{t("details.buildNumber")}</label>
            <input
              className="input font-mono"
              type="number"
              min={1}
              value={cfg.build}
              aria-label={t("details.buildNumber")}
              data-help={t("details.buildNumberHelp")}
              onChange={(e) => set("build", Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="mt-1 text-xs text-surface-500">{t("details.buildNumberHint", { next: String(nextVersionCode) })}</p>
          </div>
          <div>
            <label className="label">{t("details.orientation")}</label>
            <select
              className="input"
              value={cfg.orientation}
              aria-label={t("details.orientation")}
              data-help={t("details.orientationHelp")}
              onChange={(e) => set("orientation", e.target.value as NativeConfig["orientation"])}
            >
              <option value="default">{t("details.orientationDefault")}</option>
              <option value="portrait">{t("details.orientationPortrait")}</option>
              <option value="landscape">{t("details.orientationLandscape")}</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{t("details.themeColor")}</label>
              <ColorField value={cfg.themeColor} onChange={(v) => set("themeColor", v)} pickLabel={t("details.pickThemeColor")} codeLabel={t("details.themeColorCode")} help={t("details.themeColorHelp")} />
            </div>
            <div>
              <label className="label">{t("details.background")}</label>
              <ColorField value={cfg.backgroundColor} onChange={(v) => set("backgroundColor", v)} pickLabel={t("details.pickBackground")} codeLabel={t("details.backgroundCode")} help={t("details.backgroundHelp")} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className="btn-primary" disabled={saving} onClick={save} data-help={t("details.saveHelp")}>
            {saving ? tc("saving") : t("details.save")}
          </button>
          {status && (
            <span className={status.kind === "ok" ? "text-sm text-green-400" : "text-sm text-red-400"}>
              {status.msg}
            </span>
          )}
        </div>
      </div>

      {/* ── 4. Build for the stores ───────────────────────────────── */}
      <section className="card p-6 space-y-5" aria-labelledby="nk-stores">
        <SectionTitle id="nk-stores" icon={<Store size={18} />} title={ts("stores.title")} help={ts("stores.titleHelp")} intro={ts("stores.intro")} />

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-surface-200">
            <AndroidIcon small />
            <h3 className="font-semibold">Android</h3>
          </div>
          {!engineReady && <ToolchainNotice reason={native.engine.reason} isOperator={isOperator} />}
          <div className="grid gap-4 md:grid-cols-2" id="nk-android-builds">
            <EngineBuildCard projectId={projectId} kind="debug" enabled={published && engineReady} published={published} builds={debugBuilds} onChange={() => void loadEngineBuilds()} />
            <EngineBuildCard
              projectId={projectId}
              kind="release"
              enabled={published && engineReady && !(key?.missing ?? false)}
              published={published}
              builds={releaseBuilds}
              onChange={() => {
                void loadEngineBuilds();
                void refreshKey();
              }}
            />
          </div>
          <UploadKeyCard projectId={projectId} keyInfo={key} onChange={setKey} ownerActions={ownerActions} />
          <PlaySteps deleteAccountUrl={deleteAccountUrl} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-surface-200">
            <AppleIcon small />
            <h3 className="font-semibold">{t("ios.title")}</h3>
          </div>
          <IosProjectCard
            projectId={projectId}
            published={published}
            enabled={engineReady}
            teamId={cfg.iosTeamId ?? ""}
            onTeamIdSaved={(teamId) => setCfg((c) => ({ ...c, iosTeamId: teamId }))}
          />
          {iosLocationChange && (
            <p role="status" className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
              <span>{t.rich("ios.newBuildNeeded", { b: (c) => <span className="font-semibold">{c}</span>, reason: iosLocationChange })}</span>
            </p>
          )}
          <StoreRequirements deleteAccountUrl={deleteAccountUrl} store="App Store Connect" />
        </div>
      </section>

      {/* ── 5. Links that open the app ────────────────────────────── */}
      <AppLinksCard projectId={projectId} published={published} teamId={cfg.iosTeamId ?? ""} />

      <PhoneFeaturesCard
        projectId={projectId}
        phone={phone}
        wording={cfg.permissionText ?? {}}
        onSaved={(config) => {
          setCfg(config);
          void loadPhone();
        }}
      />

      {/* ── Classic (website) app: the earlier WebView builds ─────── */}
      <details className="card p-6 group" id="classic-app">
        <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden" data-help={ts("classic.summaryHelp")}>
          <span className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/5 text-surface-300" aria-hidden>
              <Package size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-semibold">{ts("classic.title")}</span>
              <span className="mt-1 block text-sm text-surface-400">{ts("classic.intro")}</span>
              <span className="mt-2 inline-block text-sm text-brand-400 group-open:hidden">{ts("classic.show")}</span>
              <span className="mt-2 hidden text-sm text-brand-400 group-open:inline-block">{ts("classic.hide")}</span>
            </span>
          </span>
        </summary>

        <div className="mt-6 space-y-6">
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-surface-200">
                <AndroidIcon />
              </span>
              <div>
                <h3 className="text-lg font-semibold">Android</h3>
                <p className="text-sm text-surface-400">{t("android.intro")}</p>
              </div>
            </div>

            {!android.ready && <ToolchainNotice reason={android.reason} isOperator={isOperator} />}

            <div className="grid gap-4 md:grid-cols-2">
              <BuildCard
                projectId={projectId}
                kind="debug"
                title={t("android.debugTitle")}
                blurb={t("android.debugBlurb")}
                buttonLabel={t("android.debugButton")}
                enabled={canBuild}
                published={published}
                initial={latest("debug")}
                currentFeatures={current}
                onUpdate={loadPhone}
              />
              <BuildCard
                projectId={projectId}
                kind="release"
                title={t("android.releaseTitle")}
                blurb={t("android.releaseBlurb", { next: String(nextVersionCode) })}
                buttonLabel={t("android.releaseButton")}
                enabled={canBuild && !(key?.missing ?? false)}
                published={published}
                initial={latest("release")}
                currentFeatures={current}
                onUpdate={() => {
                  void refreshKey();
                  void loadPhone();
                }}
              />
            </div>

            <a
              href={`/api/projects/${projectId}/native/download?platform=android`}
              className="inline-block text-xs text-surface-500 hover:text-surface-300"
              download={published ? true : undefined}
              data-help={t("android.advancedDownloadHelp")}
              onClick={(e) => {
                if (!published) e.preventDefault();
              }}
            >
              {t("android.advancedDownload")}
            </a>
          </section>

          <section className="rounded-xl border border-white/10 p-6">
            <div className="flex items-center gap-3">
              <span className="text-surface-200">
                <AppleIcon />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{t("ios.title")}</h3>
                <div className="text-xs uppercase tracking-wider text-surface-500">App Store · TestFlight</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-surface-400" suppressHydrationWarning>
              {t("ios.intro", { fee: format.number(99, { style: "currency", currency: "USD", maximumFractionDigits: 0 }) })}
            </p>
            <ul className="mt-3 space-y-2 text-sm text-surface-300">
              <li>
                {t.rich("ios.withMac", {
                  b: (c) => <span className="font-medium text-surface-100">{c}</span>,
                  mono: (c) => <span className="font-mono text-xs" dir="ltr">{c}</span>,
                  path: "ios/App/App.xcodeproj",
                })}
              </li>
              <li>
                {t.rich("ios.withoutMac", { b: (c) => <span className="font-medium text-surface-100">{c}</span> })}
              </li>
            </ul>
            <p className="mt-3 text-sm text-surface-400">{t("ios.readme")}</p>
            {published ? (
              <a
                href={`/api/projects/${projectId}/native/download?platform=ios`}
                className="btn-ghost mt-4 inline-flex items-center justify-center gap-2"
                download
                data-help={t("ios.downloadHelp")}
              >
                <DownloadIcon />
                {t("ios.download")}
              </a>
            ) : (
              <button className="btn-ghost mt-4 cursor-not-allowed opacity-60" disabled>
                {t("publishToEnable")}
              </button>
            )}
          </section>

          <div className="rounded-xl border border-white/10 p-5 text-sm text-surface-400">
            {t.rich("browserInstall", { b: (c) => <span className="font-medium text-surface-200">{c}</span> })}
          </div>
        </div>
      </details>
    </div>
  );
}

function ToolchainNotice({ reason, isOperator }: { reason?: string; isOperator: boolean }) {
  const t = useTranslations("project.nativeApp");
  return (
    <div className="card p-5 border-amber-500/40 bg-amber-500/5 text-sm">
      <div className="flex items-center gap-2 font-semibold text-amber-300">
        <TriangleAlert size={16} aria-hidden />
        {t("toolchain.title")}
      </div>
      {reason && <p className="mt-2 font-mono text-xs text-surface-400">{reason}</p>}
      {isOperator ? (
        <p className="mt-2 text-surface-300">
          {t.rich("toolchain.operator", {
            mono: (c) => <span className="font-mono text-xs" dir="ltr">{c}</span>,
            command: "NULLKODE_ANDROID=1 bash install.sh",
            doc: "docs/mobile-apps.md",
          })}
        </p>
      ) : (
        <p className="mt-2 text-surface-300">{t("toolchain.others")}</p>
      )}
    </div>
  );
}

function BuildCard({
  projectId,
  kind,
  title,
  blurb,
  buttonLabel,
  enabled,
  published,
  initial,
  currentFeatures,
  onUpdate,
}: {
  projectId: string;
  kind: BuildKind;
  title: string;
  blurb: string;
  buttonLabel: string;
  enabled: boolean;
  published: boolean;
  initial: BuildSummary | null;
  /** The phone features the app uses now (null while loading), to spot builds that need redoing. */
  currentFeatures: PhoneFeature[] | null;
  /** Called when a build starts or ends (a Google Play build can create the upload key). */
  onUpdate?: () => void;
}) {
  const [build, setBuild] = useState<BuildSummary | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const t = useTranslations("project.nativeApp");
  const format = useFormatter();
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Poll a running build every 3 seconds.
  useEffect(() => {
    if (!build || build.status !== "running") return;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/native/build?buildId=${build.buildId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t("build.buildFailed"));
        setBuild(data);
        if (data.status !== "running") onUpdateRef.current?.();
      } catch (e) {
        setError((e as Error).message);
        setBuild((b) => (b ? { ...b, status: "error", error: (e as Error).message } : b));
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [build, projectId, t]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/native/build`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("build.couldNotStart"));
      setBuild({
        buildId: data.buildId,
        kind,
        status: "running",
        version: "",
        versionCode: data.versionCode,
        startedAt: new Date().toISOString(),
      });
      onUpdateRef.current?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  const running = starting || build?.status === "running";
  const rebuild = running ? null : rebuildReason(build, currentFeatures, kind, t);
  const seconds = build?.status === "running" ? Math.max(0, Math.round((Date.now() - Date.parse(build.startedAt)) / 1000)) : 0;
  const download = (file: "apk" | "aab") =>
    `/api/projects/${projectId}/native/build/download?buildId=${build?.buildId}&file=${file}`;
  // "Download test APK (4.2 MB)", or just the label when the size isn't known.
  const sized = (label: string, bytes?: number) => {
    if (!bytes) return label;
    const size =
      bytes >= 1024 * 1024
        ? t("build.sizeMb", { size: format.number(bytes / 1024 / 1024, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) })
        : t("build.sizeKb", { size: format.number(Math.max(1, Math.round(bytes / 1024))) });
    return t("build.withSize", { label, size });
  };

  return (
    <div className="card p-6 flex flex-col">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-surface-400 flex-1">{blurb}</p>

      {!published ? (
        <button className="btn-ghost mt-4 cursor-not-allowed opacity-60" disabled>
          {t("publishToEnable")}
        </button>
      ) : running ? (
        <button className="btn-primary mt-4 inline-flex items-center justify-center gap-2" disabled suppressHydrationWarning>
          <Spinner />
          {seconds > 0 ? t("build.buildingSeconds", { seconds }) : t("build.building")}
        </button>
      ) : build?.status === "done" ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-surface-500" suppressHydrationWarning>
            {t(build.versionCode ? "build.madeWithBuild" : "build.made", {
              version: build.version,
              build: String(build.versionCode ?? ""),
              date: format.dateTime(new Date(build.finishedAt ?? build.startedAt), { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimeZone() }),
            })}
          </p>
          {kind === "release" ? (
            <>
              <a href={download("aab")} className="btn-primary w-full inline-flex items-center justify-center gap-2" download data-help={t("build.downloadAabHelp")}>
                <DownloadIcon />
                {sized(t("build.downloadAab"), build.files?.aab?.bytes)}
              </a>
              <a href={download("apk")} className="btn-ghost w-full inline-flex items-center justify-center gap-2 text-sm" download data-help={t("build.signedApkHelp")}>
                <DownloadIcon />
                {sized(t("build.signedApk"), build.files?.apk?.bytes)}
              </a>
            </>
          ) : (
            <a href={download("apk")} className="btn-primary w-full inline-flex items-center justify-center gap-2" download data-help={t("build.downloadApkHelp")}>
              <DownloadIcon />
              {sized(t("build.downloadApk"), build.apkBytes)}
            </a>
          )}
          <button className="btn-ghost w-full text-sm" onClick={start} disabled={!enabled} data-help={kind === "release" ? t("build.againHelpRelease") : t("build.againHelpDebug")}>
            {t("build.again")}
          </button>
        </div>
      ) : (
        <button
          className="btn-primary mt-4 inline-flex items-center justify-center gap-2"
          onClick={start}
          disabled={!enabled}
          data-help={kind === "release" ? t("build.startHelpRelease") : t("build.startHelpDebug")}
        >
          <AndroidIcon small />
          {buttonLabel}
        </button>
      )}

      {(error || build?.status === "error") && (
        <p className="mt-2 text-sm text-red-400">{error || build?.error || t("build.failed")}</p>
      )}

      {rebuild && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{t.rich("build.rebuildNeeded", { b: (c) => <span className="font-semibold">{c}</span>, reason: rebuild })}</span>
        </p>
      )}

      {!running && build?.status === "done" && build.iconNote && (
        <p role="status" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-200">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            {t.rich("build.iconNotUsed", {
              b: (c) => <span className="font-semibold">{c}</span>,
              note: build.iconNote,
              link: (c) => (
                <Link href={`/projects/${projectId}#app-icon`} className="underline hover:text-amber-100">
                  {c}
                </Link>
              ),
            })}
          </span>
        </p>
      )}

      {kind === "debug" ? (
        <p className="mt-3 text-xs text-surface-500">{t("build.debugNote")}</p>
      ) : (
        <p className="mt-3 text-xs text-surface-500">{t("build.releaseNote")}</p>
      )}
    </div>
  );
}

function UploadKeyCard({
  projectId,
  keyInfo,
  onChange,
  ownerActions,
}: {
  projectId: string;
  keyInfo: UploadKeySummary | null;
  onChange: (key: UploadKeySummary | null) => void;
  ownerActions: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const t = useTranslations("project.nativeApp");
  const tc = useTranslations("common");
  const format = useFormatter();

  async function importKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const form = new FormData(e.currentTarget);
      form.set("replace", keyInfo && form.get("replace") ? "true" : "false");
      const res = await fetch(`/api/projects/${projectId}/native/keystore`, { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("key.couldNotUse"));
      onChange(data.key);
      setOpen(false);
      setDone(t("key.saved"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <KeyRound size={18} className="text-surface-300" aria-hidden />
        <h3 className="font-semibold" data-help={t("key.titleHelp")}>{t("key.title")}</h3>
      </div>

      {!keyInfo ? (
        <p className="mt-2 text-sm text-surface-400">{t("key.none")}</p>
      ) : (
        <div className="mt-2 space-y-3 text-sm">
          <p className="text-surface-400" suppressHydrationWarning>
            {t.rich(keyInfo.imported ? "key.importedOn" : "key.madeOn", {
              date: format.dateTime(new Date(keyInfo.updatedAt), { dateStyle: "medium", timeZone: viewerTimeZone() }),
              alias: keyInfo.alias,
              mono: (c) => <span className="font-mono text-xs text-surface-300">{c}</span>,
            })}
          </p>
          <div>
            <div className="text-xs uppercase tracking-wider text-surface-500" data-help={t("key.fingerprintHelp")}>{t("key.fingerprint")}</div>
            <div className="mt-1 break-all font-mono text-xs text-surface-300" dir="ltr">{keyInfo.sha256}</div>
          </div>
          {keyInfo.missing ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-red-300">{t("key.missing")}</p>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="flex items-center gap-2 font-medium text-amber-300">
                <ShieldCheck size={16} aria-hidden />
                {t("key.keepSafe")}
              </p>
              <p className="mt-1 text-surface-400">{t("key.backupHint")}</p>
              {ownerActions ? (
                <a
                  href={`/api/projects/${projectId}/native/keystore/download`}
                  className="btn-ghost mt-3 inline-flex items-center gap-2"
                  download
                  data-help={t("key.downloadHelp")}
                >
                  <DownloadIcon />
                  {t("key.download")}
                </a>
              ) : (
                <p className="mt-2 text-xs text-surface-500">{t("key.ownerOnly")}</p>
              )}
            </div>
          )}
        </div>
      )}

      {done && <p className="mt-3 text-sm text-green-400">{done}</p>}

      {ownerActions && (
        <div className="mt-4">
          <button className="text-sm text-brand-400 hover:underline" onClick={() => setOpen((o) => !o)} data-help={open ? t("key.toggleHelpOpen") : t("key.toggleHelpClosed")}>
            {open ? tc("cancel") : keyInfo ? t("key.useDifferent") : t("key.useExisting")}
          </button>
          {open && (
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={importKey}>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="nk-keystore">{t("key.file")}</label>
                <input id="nk-keystore" name="keystore" type="file" accept=".jks,.keystore,.p12,.pfx" required className="input" data-help={t("key.fileHelp")} />
              </div>
              <div>
                <label className="label" htmlFor="nk-alias">{t("key.alias")}</label>
                <input id="nk-alias" name="alias" className="input font-mono" placeholder={t("key.aliasPlaceholder")} autoComplete="off" data-help={t("key.aliasHelp")} />
              </div>
              <div>
                <label className="label" htmlFor="nk-storepass">{t("key.storePassword")}</label>
                <input id="nk-storepass" name="storePassword" type="password" required className="input" autoComplete="off" data-help={t("key.storePasswordHelp")} />
              </div>
              <div>
                <label className="label" htmlFor="nk-keypass">{t("key.keyPassword")}</label>
                <input id="nk-keypass" name="keyPassword" type="password" className="input" placeholder={t("key.keyPasswordPlaceholder")} autoComplete="off" data-help={t("key.keyPasswordHelp")} />
              </div>
              {keyInfo && (
                <label className="sm:col-span-2 flex items-start gap-2 text-sm text-surface-300">
                  <input type="checkbox" name="replace" value="true" required className="mt-1" data-help={t("key.replaceHelp")} />
                  <span>{t("key.replace")}</span>
                </label>
              )}
              <div className="sm:col-span-2 flex items-center gap-3">
                <button className="btn-primary" disabled={busy} data-help={t("key.saveHelp")}>
                  {busy ? t("key.checking") : t("key.save")}
                </button>
                {error && <span className="text-sm text-red-400">{error}</span>}
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The phone features the app uses, where each comes from, and the wording
 * the phone shows when the app asks (iPhone shows the wording; Android shows
 * its own). The wording is saved with the app's settings and goes into the
 * next build or download.
 */
function PhoneFeaturesCard({
  projectId,
  phone,
  wording,
  onSaved,
}: {
  projectId: string;
  phone: PhoneInfo | null;
  wording: Partial<Record<WordingKey, string>>;
  onSaved: (config: NativeConfig) => void;
}) {
  // Starts from the saved wording; after a save the boxes already show it.
  const [texts, setTexts] = useState<Partial<Record<WordingKey, string>>>(wording);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const t = useTranslations("project.nativeApp");
  const tc = useTranslations("common");
  const format = useFormatter();

  const icons: Record<PhoneFeature, React.ReactNode> = {
    camera: <Camera size={16} aria-hidden />,
    microphone: <Mic size={16} aria-hidden />,
    location: <MapPin size={16} aria-hidden />,
    files: <FileUp size={16} aria-hidden />,
  };
  const fields: Array<{ key: WordingKey; label: string; show: boolean }> = [
    { key: "camera", label: t("features.camera.label"), show: true },
    { key: "photos", label: t("phone.photoLibrary"), show: true },
    { key: "microphone", label: t("features.microphone.label"), show: true },
    { key: "location", label: t("features.location.label"), show: Boolean(phone?.features.includes("location") || wording.location) },
  ];

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const permissionText = Object.fromEntries(fields.map((f) => [f.key, (texts[f.key] ?? "").trim()]));
      const res = await fetch(`/api/projects/${projectId}/native`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ permissionText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("details.couldNotSave"));
      onSaved(data.config);
      setMessage({ kind: "ok", text: t("phone.saved") });
    } catch (e) {
      setMessage({ kind: "err", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-6" aria-labelledby="phone-features-heading">
      <div className="flex items-center gap-2">
        <Smartphone size={18} className="text-surface-300" aria-hidden />
        <h2 id="phone-features-heading" className="font-semibold" data-help={t("phone.titleHelp")}>{t("phone.title")}</h2>
      </div>
      <p className="mt-1 text-sm text-surface-400">{t("phone.intro")}</p>

      {!phone ? (
        <p className="mt-4 text-sm text-surface-500">{t("phone.checking")}</p>
      ) : phone.features.length === 0 ? (
        <p className="mt-4 text-sm text-surface-300">{t("phone.none")}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {phone.features.map((f) => {
            const sources = phone.sources[f] ?? [];
            return (
              <li key={f} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5 text-surface-200">{icons[f]}</span>
                <span className="min-w-0">
                  <span className="block font-medium text-surface-100">{t(`features.${f}.label`)}</span>
                  <span className="block text-surface-400">{t(`features.${f}.about`)}</span>
                  {sources.length > 0 && (
                    <span className="mt-0.5 block text-xs text-surface-500">
                      {t("phone.usedBy", {
                        sources: format.list(
                          sources.map((src) => (src.kind === "module" ? src.label : t("phone.sourcePage", { name: src.label }))),
                          { type: "unit" },
                        ),
                      })}
                    </span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-5">
        <summary className="cursor-pointer text-sm font-medium text-brand-400 hover:underline" data-help={t("phone.wordingSummaryHelp")}>
          {t("phone.wordingSummary")}
        </summary>
        <p className="mt-2 text-sm text-surface-400">{t("phone.wordingIntro")}</p>
        <div className="mt-3 grid gap-3">
          {fields.filter((f) => f.show).map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="label">{f.label}</span>
              <textarea
                className="input min-h-[60px] w-full"
                maxLength={300}
                data-help={t("phone.wordingHelp")}
                value={texts[f.key] ?? ""}
                placeholder={phone?.suggested[f.key] ?? ""}
                onChange={(e) => {
                  setTexts((prev) => ({ ...prev, [f.key]: e.target.value }));
                  setMessage(null);
                }}
              />
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving} data-help={t("phone.saveHelp")}>
            {saving ? tc("saving") : t("phone.save")}
          </button>
          {message && (
            <span className={message.kind === "ok" ? "text-sm text-green-400" : "text-sm text-red-400"}>{message.text}</span>
          )}
        </div>
      </details>
    </section>
  );
}

/** What both stores ask every app with sign-up for: an account deletion link and a privacy policy. */
function StoreRequirements({ deleteAccountUrl, store }: { deleteAccountUrl: string; store: string }) {
  const t = useTranslations("project.nativeApp");
  return (
    <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-surface-300">
      <p className="font-medium text-surface-100">{t("store.before", { store })}</p>
      <ul className="mt-2 list-disc space-y-1.5 ps-5">
        <li>
          {t.rich("store.deleteAccount", {
            url: deleteAccountUrl,
            mono: (c) => <span className="break-all font-mono text-xs text-surface-100" dir="ltr">{c}</span>,
          })}
        </li>
        <li>{t("store.privacy")}</li>
      </ul>
    </div>
  );
}

function PlaySteps({ deleteAccountUrl }: { deleteAccountUrl: string }) {
  const t = useTranslations("project.nativeApp");
  const format = useFormatter();
  const b = (c: React.ReactNode) => <b>{c}</b>;
  return (
    <details className="card p-6 group" open>
      <summary className="cursor-pointer font-semibold" data-help={t("play.titleHelp")}>{t("play.title")}</summary>
      <ol className="mt-3 list-decimal space-y-2 ps-5 text-sm text-surface-300">
        <li suppressHydrationWarning>
          {t.rich("play.signUp", {
            url: "play.google.com/console",
            fee: format.number(25, { style: "currency", currency: "USD", maximumFractionDigits: 0 }),
            link: (c) => (
              <a href="https://play.google.com/console" target="_blank" rel="noreferrer" dir="ltr" className="text-brand-400 hover:underline">
                {c}
              </a>
            ),
          })}
        </li>
        <li>{t.rich("play.createApp", { b })}</li>
        <li>{t("play.listing")}</li>
        <li>
          {t.rich("play.appContent", {
            b,
            url: deleteAccountUrl,
            mono: (c) => <span className="break-all font-mono text-xs text-surface-100" dir="ltr">{c}</span>,
          })}
        </li>
        <li>{t.rich("play.release", { b })}</li>
        <li>{t.rich("play.signing", { b })}</li>
        <li>{t.rich("play.upload", { b })}</li>
        <li>{t("play.updates")}</li>
      </ol>
      <p className="mt-3 text-xs text-surface-500">{t("play.note")}</p>
    </details>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ColorField({ value, onChange, pickLabel, codeLabel, help }: { value: string; onChange: (v: string) => void; pickLabel: string; codeLabel: string; help?: string }) {
  const t = useTranslations("project.nativeApp");
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0b0b0b"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 shrink-0 rounded border border-surface-700 bg-transparent p-0.5"
        aria-label={pickLabel}
        data-help={help}
      />
      <input
        className="input font-mono"
        aria-label={codeLabel}
        data-help={t("details.colorCodeHelp")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function AndroidIcon({ small }: { small?: boolean }) {
  const s = small ? 16 : 26;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M6 18a1 1 0 0 0 1 1h1v3a1 1 0 0 0 2 0v-3h4v3a1 1 0 0 0 2 0v-3h1a1 1 0 0 0 1-1V9H6v9zM3.5 9A1.5 1.5 0 0 0 2 10.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 3.5 9zm17 0a1.5 1.5 0 0 0-1.5 1.5v5a1.5 1.5 0 0 0 3 0v-5A1.5 1.5 0 0 0 20.5 9zM15.5 4.6l1.3-1.3a.5.5 0 0 0-.7-.7l-1.5 1.5A6 6 0 0 0 12 3.5a6 6 0 0 0-2.6.6L7.9 2.6a.5.5 0 1 0-.7.7l1.3 1.3A5.6 5.6 0 0 0 6 8h12a5.6 5.6 0 0 0-2.5-3.4zM9.5 6.5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5zm5 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5z" />
    </svg>
  );
}

function AppleIcon({ small }: { small?: boolean }) {
  const s = small ? 16 : 26;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.1 1-.04 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.6 1.1-.02 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.02-.01-2.1-.8-2.1-3.2zM14.3 6c.6-.7 1-1.7.9-2.7-.8.03-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6.9.07 1.8-.5 2.5-1.2z" />
    </svg>
  );
}
