/**
 * Passthrough layout for the preview route. The preview page renders its
 * own full <html> document, so we just pass children through with no
 * wrapping. This file exists solely to satisfy Next.js's "every route
 * group needs a root layout" requirement.
 */
export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
