import { NextIntlClientProvider } from "next-intl";
import { scopedMessages } from "./messages";
import type { ScopeId } from "./scopes.generated";

/**
 * Gives the browser code below it the message areas its route segment uses
 * (worked out by scripts/i18n-scopes.ts into ./scopes.generated.ts), instead
 * of every area. Wrap a segment layout's whole output in it:
 * `<ScopedIntl segment="(main)/admin">{children}</ScopedIntl>`, where the
 * segment is the layout's folder under src/app (a page.tsx can open its own
 * as "<folder>/page"). Run `pnpm i18n:scopes` after adding one.
 */
export async function ScopedIntl({ segment, children }: { segment: ScopeId; children: React.ReactNode }) {
  return <NextIntlClientProvider messages={await scopedMessages(segment)}>{children}</NextIntlClientProvider>;
}
