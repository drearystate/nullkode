"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { KeyRound, ShieldCheck, TriangleAlert } from "lucide-react";

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
};

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
};

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
}: {
  projectId: string;
  initialConfig: NativeConfig;
  published: boolean;
  liveUrl: string;
  /** Whether this server can build Android apps, and why not. */
  android: { ready: boolean; reason?: string };
  /** The signed-in person runs this server (sees installer tips). */
  isOperator: boolean;
  /** False while someone acts as the owner: the upload key stays owner-only. */
  ownerActions: boolean;
  initialKey: UploadKeySummary | null;
  initialBuilds: BuildSummary[];
}) {
  const [cfg, setCfg] = useState<NativeConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [key, setKey] = useState<UploadKeySummary | null>(initialKey);

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
      if (!res.ok) throw new Error(data.error || "Could not save");
      setCfg(data.config);
      setStatus({ kind: "ok", msg: "Saved." });
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

  return (
    <div className="space-y-6">
      {!published && (
        <div className="card p-5 border-amber-500/40 bg-amber-500/5">
          <div className="font-semibold text-amber-300">Publish your app first</div>
          <p className="mt-1 text-sm text-surface-300">
            The mobile app shows your live published site, so it needs to be live before you can
            build it. Anything you publish later updates the app by itself, with no new build.
          </p>
          <Link href={`/projects/${projectId}/publish`} className="btn-primary mt-3 inline-flex">
            Go to Publish
          </Link>
        </div>
      )}

      {published && (
        <div className="card p-4 text-sm">
          <span className="text-surface-400">Your app shows: </span>
          <a href={liveUrl} target="_blank" rel="noreferrer" className="text-brand-400 hover:underline break-all">
            {liveUrl}
          </a>
          {liveUrl.startsWith("http://") && (
            <p className="mt-2 text-amber-300">
              Phones only open apps from a secure address (https). This address starts with
              http://, so the phone app can&apos;t load it. Set up https for this server first.
            </p>
          )}
        </div>
      )}

      {/* ── App identity ──────────────────────────────────────────── */}
      <div className="card p-6">
        <h2 className="font-semibold">App details</h2>
        <p className="mt-1 text-sm text-surface-400">
          These appear in the app stores and on the phone&apos;s home screen.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">App name</label>
            <input
              className="input"
              value={cfg.appName}
              maxLength={30}
              onChange={(e) => set("appName", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Bundle / Application ID</label>
            <input
              className="input font-mono"
              value={cfg.appId}
              onChange={(e) => set("appId", e.target.value)}
              placeholder="com.company.app"
            />
            <p className="mt-1 text-xs text-surface-500">
              Like com.company.app, in lowercase. Once your app is in a store, never change it.
            </p>
          </div>
          <div>
            <label className="label">Version</label>
            <input
              className="input font-mono"
              value={cfg.version}
              onChange={(e) => set("version", e.target.value)}
              placeholder="1.0.0"
            />
          </div>
          <div>
            <label className="label">Build number</label>
            <input
              className="input font-mono"
              type="number"
              min={1}
              value={cfg.build}
              onChange={(e) => set("build", Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="mt-1 text-xs text-surface-500">
              Google Play builds count up from here by themselves. Next one: {nextVersionCode}.
            </p>
          </div>
          <div>
            <label className="label">Orientation</label>
            <select
              className="input"
              value={cfg.orientation}
              onChange={(e) => set("orientation", e.target.value as NativeConfig["orientation"])}
            >
              <option value="default">Follow device</option>
              <option value="portrait">Portrait only</option>
              <option value="landscape">Landscape only</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Theme color</label>
              <ColorField value={cfg.themeColor} onChange={(v) => set("themeColor", v)} />
            </div>
            <div>
              <label className="label">Background</label>
              <ColorField value={cfg.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className="btn-primary" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save settings"}
          </button>
          {status && (
            <span className={status.kind === "ok" ? "text-sm text-green-400" : "text-sm text-red-400"}>
              {status.msg}
            </span>
          )}
        </div>
      </div>

      {/* ── Android ───────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-surface-200">
            <AndroidIcon />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Android</h2>
            <p className="text-sm text-surface-400">We build it on the server. Pick what you want to do:</p>
          </div>
        </div>

        {!android.ready && <ToolchainNotice reason={android.reason} isOperator={isOperator} />}

        <div className="grid gap-4 md:grid-cols-2">
          <BuildCard
            projectId={projectId}
            kind="debug"
            title="Test on your phone (APK)"
            blurb="A quick test copy. Install it straight on an Android phone to try your app. Google Play won't accept this file."
            buttonLabel="Build test APK"
            enabled={canBuild}
            published={published}
            initial={latest("debug")}
          />
          <BuildCard
            projectId={projectId}
            kind="release"
            title="Publish on Google Play (AAB)"
            blurb={`The file Google Play asks for, signed with your app's own upload key. Each build gets the next build number (${nextVersionCode} next).`}
            buttonLabel="Build for Google Play"
            enabled={canBuild && !(key?.missing ?? false)}
            published={published}
            initial={latest("release")}
            onUpdate={refreshKey}
          />
        </div>

        <UploadKeyCard projectId={projectId} keyInfo={key} onChange={setKey} ownerActions={ownerActions} />
        <PlaySteps />

        <a
          href={`/api/projects/${projectId}/native/download?platform=android`}
          className="inline-block text-xs text-surface-500 hover:text-surface-300"
          download={published ? true : undefined}
          onClick={(e) => {
            if (!published) e.preventDefault();
          }}
        >
          Advanced: download the project to build it yourself in Android Studio
        </a>
      </section>

      {/* ── iOS ───────────────────────────────────────────────────── */}
      <section className="card p-6">
        <div className="flex items-center gap-3">
          <span className="text-surface-200">
            <AppleIcon />
          </span>
          <div>
            <h2 className="text-lg font-semibold">iPhone and iPad</h2>
            <div className="text-xs uppercase tracking-wider text-surface-500">App Store · TestFlight</div>
          </div>
        </div>
        <p className="mt-3 text-sm text-surface-400">
          Download the iPhone project. It opens straight in Xcode, with no setup commands. Apple
          only lets you publish with a paid Apple Developer account ($99 a year), and only a Mac
          can build iPhone apps. You have two ways:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-surface-300">
          <li>
            <span className="font-medium text-surface-100">With a Mac:</span> open{" "}
            <span className="font-mono text-xs">ios/App/App.xcodeproj</span>, pick your team, then
            Product → Archive.
          </li>
          <li>
            <span className="font-medium text-surface-100">Without a Mac:</span> put the folder on
            GitHub and add your Apple keys as secrets. The included workflow builds your app on
            GitHub&apos;s Macs and sends it to TestFlight.
          </li>
        </ul>
        <p className="mt-3 text-sm text-surface-400">
          The README in the download walks you through both, step by step.
        </p>
        {published ? (
          <a
            href={`/api/projects/${projectId}/native/download?platform=ios`}
            className="btn-primary mt-4 inline-flex items-center justify-center gap-2"
            download
          >
            <DownloadIcon />
            Download iPhone project
          </a>
        ) : (
          <button className="btn-ghost mt-4 cursor-not-allowed opacity-60" disabled>
            Publish to enable
          </button>
        )}
      </section>

      <div className="card p-5 text-sm text-surface-400">
        <span className="font-medium text-surface-200">Already installable from the browser.</span>{" "}
        Your published site can also be added to a phone&apos;s home screen straight from the
        browser — no store needed.
      </div>
    </div>
  );
}

function ToolchainNotice({ reason, isOperator }: { reason?: string; isOperator: boolean }) {
  return (
    <div className="card p-5 border-amber-500/40 bg-amber-500/5 text-sm">
      <div className="flex items-center gap-2 font-semibold text-amber-300">
        <TriangleAlert size={16} aria-hidden />
        Android builds are turned off on this server
      </div>
      {reason && <p className="mt-2 font-mono text-xs text-surface-400">{reason}</p>}
      {isOperator ? (
        <p className="mt-2 text-surface-300">
          You run this server. To turn them on, run the installer again and answer yes when it
          asks about Android. You can also run{" "}
          <span className="font-mono text-xs">NULLKODE_ANDROID=1 bash install.sh</span> in the
          folder you installed it in. Installed without Docker? See docs/mobile-apps.md.
        </p>
      ) : (
        <p className="mt-2 text-surface-300">
          Ask the person who runs this server to turn them on. You can still download the project
          and build it yourself.
        </p>
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
  /** Called when a build starts or ends (a Google Play build can create the upload key). */
  onUpdate?: () => void;
}) {
  const [build, setBuild] = useState<BuildSummary | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  // Poll a running build every 3 seconds.
  useEffect(() => {
    if (!build || build.status !== "running") return;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/native/build?buildId=${build.buildId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Build failed");
        setBuild(data);
        if (data.status !== "running") onUpdateRef.current?.();
      } catch (e) {
        setError((e as Error).message);
        setBuild((b) => (b ? { ...b, status: "error", error: (e as Error).message } : b));
      }
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [build, projectId]);

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
      if (!res.ok) throw new Error(data.error || "Could not start the build");
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
  const seconds = build?.status === "running" ? Math.max(0, Math.round((Date.now() - Date.parse(build.startedAt)) / 1000)) : 0;
  const download = (file: "apk" | "aab") =>
    `/api/projects/${projectId}/native/build/download?buildId=${build?.buildId}&file=${file}`;

  return (
    <div className="card p-6 flex flex-col">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-surface-400 flex-1">{blurb}</p>

      {!published ? (
        <button className="btn-ghost mt-4 cursor-not-allowed opacity-60" disabled>
          Publish to enable
        </button>
      ) : running ? (
        <button className="btn-primary mt-4 inline-flex items-center justify-center gap-2" disabled>
          <Spinner />
          Building… {seconds > 0 ? `(${seconds}s)` : ""}
        </button>
      ) : build?.status === "done" ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-surface-500">
            Version {build.version}
            {build.versionCode ? ` (build ${build.versionCode})` : ""} · made{" "}
            {new Date(build.finishedAt ?? build.startedAt).toLocaleString()}
          </p>
          {kind === "release" ? (
            <>
              <a href={download("aab")} className="btn-primary w-full inline-flex items-center justify-center gap-2" download>
                <DownloadIcon />
                Download AAB for Google Play{size(build.files?.aab?.bytes)}
              </a>
              <a href={download("apk")} className="btn-ghost w-full inline-flex items-center justify-center gap-2 text-sm" download>
                <DownloadIcon />
                Signed APK for other stores{size(build.files?.apk?.bytes)}
              </a>
            </>
          ) : (
            <a href={download("apk")} className="btn-primary w-full inline-flex items-center justify-center gap-2" download>
              <DownloadIcon />
              Download test APK{size(build.apkBytes)}
            </a>
          )}
          <button className="btn-ghost w-full text-sm" onClick={start} disabled={!enabled}>
            Build again
          </button>
        </div>
      ) : (
        <button
          className="btn-primary mt-4 inline-flex items-center justify-center gap-2"
          onClick={start}
          disabled={!enabled}
        >
          <AndroidIcon small />
          {buttonLabel}
        </button>
      )}

      {(error || build?.status === "error") && (
        <p className="mt-2 text-sm text-red-400">{error || build?.error || "The build failed."}</p>
      )}

      {kind === "debug" ? (
        <p className="mt-3 text-xs text-surface-500">
          On the phone, open the file and allow installing it when asked. If the phone has a
          Google Play copy of this app, remove that first: the two use different keys.
        </p>
      ) : (
        <p className="mt-3 text-xs text-surface-500">
          The first build makes your app&apos;s upload key. Download a backup of it below.
        </p>
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
      if (!res.ok) throw new Error(data.error || "Could not use this key");
      onChange(data.key);
      setOpen(false);
      setDone("Your key is saved. Google Play builds now use it.");
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
        <h3 className="font-semibold">Your upload key</h3>
      </div>

      {!keyInfo ? (
        <p className="mt-2 text-sm text-surface-400">
          Google Play checks this key on every update. We make one for your app the first time you
          build for Google Play. Already on Google Play with a key of your own? Add it here first.
        </p>
      ) : (
        <div className="mt-2 space-y-3 text-sm">
          <p className="text-surface-400">
            {keyInfo.imported ? "Your own key" : "Made for this app"} on{" "}
            {new Date(keyInfo.updatedAt).toLocaleDateString()} · alias{" "}
            <span className="font-mono text-xs text-surface-300">{keyInfo.alias}</span>
          </p>
          <div>
            <div className="text-xs uppercase tracking-wider text-surface-500">Certificate fingerprint (SHA-256)</div>
            <div className="mt-1 break-all font-mono text-xs text-surface-300">{keyInfo.sha256}</div>
          </div>
          {keyInfo.missing ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 text-red-300">
              The key file is missing from the server. Add your backup below (&quot;Use a key I
              already have&quot;) to keep updating your app on Google Play.
            </p>
          ) : (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <p className="flex items-center gap-2 font-medium text-amber-300">
                <ShieldCheck size={16} aria-hidden />
                Keep this safe — you need it for every update on Google Play.
              </p>
              <p className="mt-1 text-surface-400">
                Save the backup somewhere private, like a password manager. It holds the key and
                its passwords.
              </p>
              {ownerActions ? (
                <a
                  href={`/api/projects/${projectId}/native/keystore/download`}
                  className="btn-ghost mt-3 inline-flex items-center gap-2"
                  download
                >
                  <DownloadIcon />
                  Download key backup
                </a>
              ) : (
                <p className="mt-2 text-xs text-surface-500">Only the app&apos;s owner can download the key.</p>
              )}
            </div>
          )}
        </div>
      )}

      {done && <p className="mt-3 text-sm text-green-400">{done}</p>}

      {ownerActions && (
        <div className="mt-4">
          <button className="text-sm text-brand-400 hover:underline" onClick={() => setOpen((o) => !o)}>
            {open ? "Cancel" : keyInfo ? "Use a different key" : "Use a key I already have"}
          </button>
          {open && (
            <form className="mt-3 grid gap-3 sm:grid-cols-2" onSubmit={importKey}>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="nk-keystore">Keystore file (.jks or .keystore)</label>
                <input id="nk-keystore" name="keystore" type="file" accept=".jks,.keystore,.p12,.pfx" required className="input" />
              </div>
              <div>
                <label className="label" htmlFor="nk-alias">Key alias</label>
                <input id="nk-alias" name="alias" className="input font-mono" placeholder="Leave empty if there's only one" autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="nk-storepass">Keystore password</label>
                <input id="nk-storepass" name="storePassword" type="password" required className="input" autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="nk-keypass">Key password</label>
                <input id="nk-keypass" name="keyPassword" type="password" className="input" placeholder="Leave empty if it's the same" autoComplete="off" />
              </div>
              {keyInfo && (
                <label className="sm:col-span-2 flex items-start gap-2 text-sm text-surface-300">
                  <input type="checkbox" name="replace" value="true" required className="mt-1" />
                  <span>
                    Replace my current key. Only do this if Google Play expects this other key:
                    download a backup of the current one first.
                  </span>
                </label>
              )}
              <div className="sm:col-span-2 flex items-center gap-3">
                <button className="btn-primary" disabled={busy}>
                  {busy ? "Checking…" : "Save key"}
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

function PlaySteps() {
  return (
    <details className="card p-6 group" open>
      <summary className="cursor-pointer font-semibold">Put your app on Google Play</summary>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-surface-300">
        <li>
          Sign up for a Google Play developer account at{" "}
          <a href="https://play.google.com/console" target="_blank" rel="noreferrer" className="text-brand-400 hover:underline">
            play.google.com/console
          </a>
          . Google charges a one-time fee of $25.
        </li>
        <li>Click <b>Create app</b>, type your app&apos;s name and answer the short questions.</li>
        <li>
          Fill in the store listing: a short and a full description, an icon (512 × 512), a
          feature picture (1024 × 500) and at least two phone screenshots.
        </li>
        <li>
          Open <b>Test and release</b>, pick a track (<b>Internal testing</b> is the quickest way to
          try it) and click <b>Create new release</b>.
        </li>
        <li>
          If Google asks about app signing, keep <b>Let Google manage and protect your app signing
          key</b>.
        </li>
        <li>
          Upload the <b>.aab</b> file from above, write a few words about what&apos;s new, then save
          and send the release out.
        </li>
        <li>
          Later updates: publishing changes here updates your app by itself. Only build a new AAB
          when you change the name, icon, colors or version, and upload it the same way. The build
          number goes up by itself.
        </li>
      </ol>
      <p className="mt-3 text-xs text-surface-500">
        New personal developer accounts must first test the app with at least 12 people for 14
        days before Google lets them publish it to everyone.
      </p>
    </details>
  );
}

function size(bytes?: number): string {
  if (!bytes) return "";
  return bytes >= 1024 * 1024 ? ` (${(bytes / 1024 / 1024).toFixed(1)} MB)` : ` (${Math.max(1, Math.round(bytes / 1024))} KB)`;
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#0b0b0b"}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 shrink-0 rounded border border-surface-700 bg-transparent p-0.5"
        aria-label="Pick color"
      />
      <input
        className="input font-mono"
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

function AppleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.4 12.6c0-2.2 1.8-3.3 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.8.8-3.5 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.1 1-.04 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.6 1.1-.02 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.02-.01-2.1-.8-2.1-3.2zM14.3 6c.6-.7 1-1.7.9-2.7-.8.03-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6.9.07 1.8-.5 2.5-1.2z" />
    </svg>
  );
}
