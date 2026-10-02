import { ScopedIntl } from "@/i18n/scoped-intl";

// Sends this part of the studio only the messages its pages use (pnpm i18n:scopes).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ScopedIntl segment="(main)/designer">{children}</ScopedIntl>;
}
