"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { ScaffoldWizard } from "./ai/scaffold-wizard";
import { TemplateGallery } from "./template-gallery";
import { BlankProjectCreator } from "./blank-project-creator";
import { CloneSiteForm } from "./clone-site-form";
import { ImportAppForm } from "./import-app-form";
import { StartAlternatives } from "./start-alternatives";
import { BUILD_METHODS } from "./studio/build-methods";

/**
 * /new leads with one idea box (describe it, review a plan, build). Templates
 * and the other ways to start sit underneath it. Installs without an AI model
 * lead with templates instead.
 */
export function NewProjectWizard({ aiReady, aiProblem, isAdmin }: { aiReady: boolean; aiProblem: string | null; isAdmin: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get("mode");
  const methods = BUILD_METHODS.filter((m) => aiReady || (m.id !== "ai" && m.id !== "designer"));
  const selected = methods.find((m) => m.id === mode && m.id !== "ai");
  useEffect(() => { if (mode === "designer") router.replace("/designer"); }, [mode, router]);
  const back = () => router.push("/new");

  if (!selected) {
    if (!aiReady) {
      return (
        <div className="studio-creation-flow">
          <div className="mx-auto max-w-5xl px-5 pt-8">
            <Link href="/dashboard" className="studio-back-link"><ArrowLeft size={15} />Back to your apps</Link>
            {isAdmin && (
              <p role="status" className="mt-6 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-surface-300">
                Want people to build apps just by describing them? <Link href="/admin/settings" className="text-brand-300 underline underline-offset-2">Connect an AI model</Link> in Settings. It works with hosted models or one running on your own computer.
              </p>
            )}
          </div>
          <TemplateGallery heading="Start your app" subheading="Pick a design you like. You can change every word, picture and colour afterwards." />
          <div className="mx-auto max-w-5xl px-5 pb-12"><StartAlternatives aiReady={false} /></div>
        </div>
      );
    }
    return (
      <div className="studio-creation-flow">
        <div className="mx-auto max-w-4xl px-5 pt-8"><Link href="/dashboard" className="studio-back-link"><ArrowLeft size={15} />Back to your apps</Link></div>
        <ScaffoldWizard aiProblem={aiProblem} below={<StartAlternatives aiReady />} />
      </div>
    );
  }

  return (
    <div className="studio-creation-flow">
      <nav className="studio-creation-nav" aria-label="Ways to start">
        <Link href="/new" className="studio-back-link"><ArrowLeft size={15} /><span>{aiReady ? "Describe your app" : "Start your app"}</span></Link>
        <div className="flex gap-1 overflow-x-auto">
          {methods.filter((m) => m.id !== "ai").map(({ id, href, title, icon: Icon }) => (
            <Link key={id} href={href} aria-current={mode === id ? "page" : undefined} className={mode === id ? "active" : ""}><Icon size={15} /><span>{title}</span></Link>
          ))}
        </div>
      </nav>
      {mode === "template" && <TemplateGallery onBack={back} initialId={searchParams.get("t")} />}
      {mode === "blank" && <BlankProjectCreator onBack={back} />}
      {mode === "clone" && <CloneSiteForm onBack={back} />}
      {mode === "import" && <ImportAppForm />}
      {mode === "designer" && <p className="p-10 text-center text-surface-400">Opening Designer…</p>}
    </div>
  );
}
