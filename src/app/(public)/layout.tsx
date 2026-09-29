// Default metadata is set per-page via generateMetadata in each route so
// every published app gets its own title + icon. We intentionally don't
// declare a layout-level metadata.icons here — that would override the
// page's metadata. The <link rel="icon"> we used to hardcode in <head>
// is gone for the same reason.

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Bootstrap + /nk-public.css are added per page by
            <PlatformStylesheets> (src/lib/public-page.tsx), which leaves them
            out for AI Designer apps — their own CSS is complete. */}
      </head>
      <body>{children}</body>
    </html>
  );
}
