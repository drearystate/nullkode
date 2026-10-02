/**
 * The viewer's time zone, so dates and times rendered on the server match
 * their clock. The browser reports it in a cookie (TZ_BOOT runs in <head>);
 * until the first page has set it, times are shown in UTC.
 */
export const TZ_COOKIE = "nk-tz";

export const TZ_BOOT = `try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z&&document.cookie.indexOf("${TZ_COOKIE}="+encodeURIComponent(z))<0)document.cookie="${TZ_COOKIE}="+encodeURIComponent(z)+";path=/;max-age=31536000;samesite=lax"}catch(e){}`;

/** The cookie's (URI-encoded) value when it names a real time zone. */
export function validTimeZone(cookie: string | undefined): string | undefined {
  if (!cookie || cookie.length > 100) return undefined;
  try {
    const value = decodeURIComponent(cookie);
    new Intl.DateTimeFormat("en", { timeZone: value });
    return value;
  } catch {
    return undefined;
  }
}
