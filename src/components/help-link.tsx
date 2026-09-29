"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { helpHref } from "@/lib/help/where";

/** The top bar's Help link: opens the guide for the screen you're on. */
export function HelpLink() {
  const pathname = usePathname() ?? "/";
  return (
    <Link href={helpHref(pathname)} className="studio-top-link" aria-label="Help" data-help="Step-by-step guides. This opens the one for the screen you're on.">
      <CircleHelp size={15} />
      <span className="hidden md:inline">Help</span>
    </Link>
  );
}
