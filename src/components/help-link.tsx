"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";
import { helpHref } from "@/lib/help/where";

/** The top bar's Help link: opens the guide for the screen you're on. */
export function HelpLink() {
  const pathname = usePathname() ?? "/";
  const t = useTranslations("nav");
  return (
    <Link href={helpHref(pathname)} className="studio-top-link" aria-label={t("help")} data-help={t("helpHelp")}>
      <CircleHelp size={15} />
      <span className="hidden md:inline">{t("help")}</span>
    </Link>
  );
}
