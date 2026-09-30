import { redirect } from "next/navigation";
import { isInstallComplete, isInstallOwner } from "@/lib/install";
import { InstallWizard } from "./wizard";

export const dynamic = "force-dynamic";

export default async function InstallPage() {
  if (await isInstallComplete()) redirect("/login");
  return (
    <main className="min-h-screen bg-surface-950 text-white antialiased">
      <InstallWizard ownerSignedIn={await isInstallOwner()} />
    </main>
  );
}
