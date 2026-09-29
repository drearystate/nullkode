/**
 * A tiny SMTP server for tests. It never relays anything: messages are kept
 * in memory so a test can read them back. Supports EHLO, AUTH PLAIN/LOGIN,
 * MAIL, RCPT, DATA, RSET, NOOP and QUIT (no TLS).
 *
 *   const sink = await startSmtpSink({ user: "u", pass: "p" });
 *   ... send to 127.0.0.1:sink.port ...
 *   sink.messages[0].subject
 */
import net from "node:net";

export type SinkMessage = {
  from: string;
  to: string[];
  raw: string;
  headers: Record<string, string>;
  subject: string;
  /** Body with quoted-printable decoded (good enough for assertions). */
  body: string;
  authUser: string | null;
};

export type SmtpSink = {
  port: number;
  messages: SinkMessage[];
  /** Resolves when `n` messages have arrived (or rejects after `ms`). */
  waitFor: (n: number, ms?: number) => Promise<SinkMessage[]>;
  close: () => Promise<void>;
};

function decodeQP(s: string): string {
  const bytes = s.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  try {
    return Buffer.from(bytes, "latin1").toString("utf8");
  } catch {
    return bytes;
  }
}

function parseMessage(raw: string, from: string, to: string[], authUser: string | null): SinkMessage {
  const split = raw.indexOf("\r\n\r\n");
  const head = split >= 0 ? raw.slice(0, split) : raw;
  const bodyRaw = split >= 0 ? raw.slice(split + 4) : "";
  const headers: Record<string, string> = {};
  for (const line of head.replace(/\r\n[ \t]+/g, " ").split("\r\n")) {
    const i = line.indexOf(":");
    if (i > 0) headers[line.slice(0, i).trim().toLowerCase()] = line.slice(i + 1).trim();
  }
  // Decode base64 parts and quoted-printable text roughly, for assertions.
  let body = bodyRaw;
  if (/base64/i.test(headers["content-transfer-encoding"] ?? "")) {
    body = Buffer.from(bodyRaw.replace(/\s+/g, ""), "base64").toString("utf8");
  } else {
    body = decodeQP(bodyRaw);
    body = body.replace(/Content-Transfer-Encoding: base64\r?\n(?:[^\r\n]+\r?\n)*\r?\n([A-Za-z0-9+/=\r\n]+)/g, (_m, b64: string) => Buffer.from(b64.replace(/\s+/g, ""), "base64").toString("utf8"));
  }
  let subject = headers.subject ?? "";
  subject = subject.replace(/=\?utf-8\?([bq])\?([^?]*)\?=/gi, (_m, enc: string, text: string) =>
    enc.toLowerCase() === "b" ? Buffer.from(text, "base64").toString("utf8") : decodeQP(text.replace(/_/g, " ")),
  );
  return { from, to, raw, headers, subject, body, authUser };
}

export async function startSmtpSink(opts: { user?: string; pass?: string; requireAuth?: boolean; rejectSender?: (from: string) => boolean; port?: number } = {}): Promise<SmtpSink> {
  const messages: SinkMessage[] = [];
  const waiters: Array<{ n: number; resolve: (m: SinkMessage[]) => void }> = [];
  const sockets = new Set<net.Socket>();

  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    let buf = "";
    let mode: "cmd" | "data" | "auth-plain" | "auth-login-user" | "auth-login-pass" = "cmd";
    let authed: string | null = null;
    let loginUser = "";
    let from = "";
    let to: string[] = [];
    let data = "";
    const say = (line: string) => socket.write(line + "\r\n");
    const checkCreds = (user: string, pass: string) => {
      if (opts.user === undefined || (user === opts.user && pass === opts.pass)) {
        authed = user;
        say("235 2.7.0 Authentication successful");
      } else {
        say("535 5.7.8 Authentication credentials invalid");
      }
    };
    say("220 nk-sink ESMTP ready");
    socket.on("data", (chunk) => {
      buf += chunk.toString("latin1");
      for (;;) {
        if (mode === "data") {
          // The message ends with a line holding a single dot.
          data += buf;
          buf = "";
          // Searching with a leading CRLF also finds a dot on the very first line.
          const end = ("\r\n" + data).indexOf("\r\n.\r\n");
          if (end < 0) return;
          buf = data.slice(end + 3);
          data = data.slice(0, end);
          const raw = Buffer.from(data.replace(/\r\n\.\./g, "\r\n.").replace(/^\.\./, "."), "latin1").toString("utf8");
          const msg = parseMessage(raw, from, to, authed);
          messages.push(msg);
          for (const w of [...waiters]) {
            if (messages.length >= w.n) {
              waiters.splice(waiters.indexOf(w), 1);
              w.resolve(messages.slice());
            }
          }
          data = "";
          from = "";
          to = [];
          mode = "cmd";
          say("250 2.0.0 OK queued");
          continue;
        }
        const nl = buf.indexOf("\r\n");
        if (nl < 0) return;
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 2);
        if (mode === "auth-plain") {
          const [, u = "", p = ""] = Buffer.from(line, "base64").toString("utf8").split("\0");
          mode = "cmd";
          checkCreds(u, p);
          continue;
        }
        if (mode === "auth-login-user") {
          loginUser = Buffer.from(line, "base64").toString("utf8");
          mode = "auth-login-pass";
          say("334 UGFzc3dvcmQ6");
          continue;
        }
        if (mode === "auth-login-pass") {
          mode = "cmd";
          checkCreds(loginUser, Buffer.from(line, "base64").toString("utf8"));
          continue;
        }
        const [verbRaw, ...rest] = line.split(" ");
        const verb = verbRaw.toUpperCase();
        const arg = rest.join(" ");
        if (verb === "EHLO") {
          socket.write("250-nk-sink\r\n250-AUTH PLAIN LOGIN\r\n250-8BITMIME\r\n250 SIZE 10485760\r\n");
        } else if (verb === "HELO") {
          say("250 nk-sink");
        } else if (verb === "AUTH") {
          const [mech, initial] = arg.split(" ");
          if (/^PLAIN$/i.test(mech)) {
            if (initial) {
              const [, u = "", p = ""] = Buffer.from(initial, "base64").toString("utf8").split("\0");
              checkCreds(u, p);
            } else {
              mode = "auth-plain";
              say("334 ");
            }
          } else if (/^LOGIN$/i.test(mech)) {
            if (initial) {
              loginUser = Buffer.from(initial, "base64").toString("utf8");
              mode = "auth-login-pass";
              say("334 UGFzc3dvcmQ6");
            } else {
              mode = "auth-login-user";
              say("334 VXNlcm5hbWU6");
            }
          } else {
            say("504 5.5.4 Unrecognized authentication type");
          }
        } else if (verb === "MAIL") {
          const addr = (arg.match(/<([^>]*)>/)?.[1] ?? "").trim();
          if ((opts.requireAuth ?? opts.user !== undefined) && !authed) say("530 5.7.0 Authentication required");
          else if (opts.rejectSender?.(addr)) say("553 5.7.1 Sender address rejected: not owned by user");
          else {
            from = addr;
            to = [];
            say("250 2.1.0 OK");
          }
        } else if (verb === "RCPT") {
          const addr = (arg.match(/<([^>]*)>/)?.[1] ?? "").trim();
          if (!from) say("503 5.5.1 Need MAIL first");
          else {
            to.push(addr);
            say("250 2.1.5 OK");
          }
        } else if (verb === "DATA") {
          if (!to.length) say("503 5.5.1 Need RCPT first");
          else {
            mode = "data";
            data = "";
            say("354 End data with <CR><LF>.<CR><LF>");
          }
        } else if (verb === "RSET") {
          from = "";
          to = [];
          say("250 2.0.0 OK");
        } else if (verb === "NOOP") {
          say("250 2.0.0 OK");
        } else if (verb === "QUIT") {
          say("221 2.0.0 Bye");
          socket.end();
          return;
        } else {
          say("502 5.5.2 Command not implemented");
        }
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port ?? 0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as net.AddressInfo).port;
  return {
    port,
    messages,
    waitFor: (n, ms = 30_000) =>
      messages.length >= n
        ? Promise.resolve(messages.slice())
        : new Promise((resolve, reject) => {
            const w = { n, resolve };
            waiters.push(w);
            setTimeout(() => {
              const i = waiters.indexOf(w);
              if (i >= 0) {
                waiters.splice(i, 1);
                reject(new Error(`SMTP sink: expected ${n} message(s), got ${messages.length}`));
              }
            }, ms).unref();
          }),
    close: () =>
      new Promise((resolve) => {
        for (const s of sockets) s.destroy();
        server.close(() => resolve());
      }),
  };
}
