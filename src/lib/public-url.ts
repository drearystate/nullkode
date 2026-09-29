import { lookup } from "node:dns/promises";
import dns from "node:dns";
import { isIP } from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a,b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18,19].includes(b)));
  }
  // Public IPv6 global unicast only. This also rejects mapped IPv4,
  // localhost, link-local, unique-local, multicast, and unspecified hosts.
  return isIP(address) === 6 && /^[23][0-9a-f]{3}:/i.test(address);
}
/** Whether every address a hostname resolves to is on the public internet. */
export async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  try {
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    return addresses.length > 0 && addresses.every((a) => publicAddress(a.address));
  } catch {
    return false;
  }
}

export async function assertPublicUrl(input: string): Promise<URL> {
  const url = new URL(input);
  if (!["http:","https:"].includes(url.protocol) || url.username || url.password) throw new Error("Use a public HTTP(S) URL without embedded credentials.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [{address:host}] : await lookup(host, { all: true });
  if (!addresses.length || addresses.some(a=>!publicAddress(a.address))) throw new Error("Private network addresses cannot be accessed by customer apps.");
  return url;
}
/**
 * DNS lookup for outgoing connections that refuses private addresses at the
 * moment of connecting. Checking a URL first and connecting later leaves a
 * gap (the name can resolve differently the second time); this closes it.
 */
export function publicOnlyLookup(
  hostname: string,
  options: dns.LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void,
): void {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    const list = (addresses ?? []) as dns.LookupAddress[];
    if (err) return callback(err, []);
    if (!list.length || list.some((a) => !publicAddress(a.address))) {
      return callback(Object.assign(new Error("Private network addresses cannot be accessed by customer apps."), { code: "EPRIVATE" }), []);
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

const publicDispatcher = new Agent({ connect: { lookup: publicOnlyLookup as never } });

export async function publicFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let url = input;
  for (let i=0;i<6;i++) {
    await assertPublicUrl(url);
    const res = (await undiciFetch(url, { ...(init as object), redirect: "manual", signal: init.signal ?? AbortSignal.timeout(20000), dispatcher: publicDispatcher } as never)) as unknown as Response;
    if (![301,302,303,307,308].includes(res.status)) return res;
    const location = res.headers.get("location");
    await res.body?.cancel();
    if (!location) throw new Error("Redirect has no destination.");
    const next = new URL(location,url).href;
    if (new URL(next).origin !== new URL(url).origin) {
      const headers = new Headers(init.headers); headers.delete("authorization"); headers.delete("cookie"); init = { ...init, headers };
    }
    if (res.status === 303 || ((res.status === 301 || res.status === 302) && init.method === "POST")) init = { ...init, method: "GET", body: undefined };
    url = next;
  }
  throw new Error("Too many redirects.");
}
