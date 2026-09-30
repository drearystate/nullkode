# Security policy

Nullkode runs other people's businesses: their customers' sign-ins, their
data and their payments. We take reports seriously and fix them quickly.
Thank you for looking.

<!-- TODO: replace YOUR_ORG and YOUR_SECURITY_EMAIL once the GitHub organisation and a security mailbox are chosen, and switch on "Private vulnerability reporting" in the repository's Security settings. -->

## Report a problem privately

Please **don't open a public issue, discussion or pull request** for a
security problem.

1. **Preferred:** report it privately on GitHub, at
   <https://github.com/YOUR_ORG/nullkode/security/advisories/new>
   (Security tab → *Report a vulnerability*). Only the maintainers see it.
2. **If that doesn't work for you:** email **YOUR_SECURITY_EMAIL**.

Helpful things to include:

- what an attacker can do, and what they need first (an account? an app
  visitor? nothing at all?);
- steps to reproduce, or a small proof of concept;
- the Nullkode version (`version` in `package.json`, or the release date) and
  how it's installed (Docker, Plesk, bare metal);
- whether the problem is already public anywhere.

Please test only against your own installation. Don't access other people's
data, don't run tests that slow down or break someone else's server, and give
us a reasonable time to fix the problem before you publish it.

## What happens next

| Step | Target |
|---|---|
| We confirm we've received your report | within 3 working days |
| First assessment (is it a problem, how serious) | within 7 days |
| Fix released for a critical or high-severity problem | within 30 days |
| Fix released for a medium or low-severity problem | in the next release, within 90 days |

We'll keep you updated, agree a disclosure date with you, and publish a GitHub
security advisory when the fix is out. We're happy to credit you by name, or
keep you anonymous if you prefer.

## Supported versions

Nullkode hasn't reached 1.0. Fixes go into the **latest 0.x release only**
(currently 0.1.x). There are no older branches that get separate fixes.

**If you run your own installation, you install updates yourself.** Nothing
updates automatically. Watch the repository's releases and security
advisories, and follow "Back up, update, or move" in
[docs/install.md](docs/install.md) to update. Take a backup first.

## What's in scope

We especially want to hear about:

- **Sign-in and accounts:** the studio's own logins and sessions, published
  apps' user logins, two-step codes, email verification, password resets,
  owner logins into apps, and administrators acting as another user.
- **Keeping customers apart:** one customer (or one reseller's client) seeing
  or changing another customer's apps, data, settings, files or bills;
  resellers reaching outside their own clients.
- **Payments:** Stripe secret keys and webhook secrets (the operator's and
  resellers'), webhook checks, and changing the price of a checkout.
- **Workflows reaching places they shouldn't:** HTTP request steps, push
  notifications or webhooks that can reach the server's own network or
  cloud metadata addresses (SSRF).
- **Uploads:** files people upload being able to run as a page, reach the
  image optimizer, or overwrite other files.
- **Addresses and custom domains:** the Host header, the `/nk-host` rewrite,
  the certificate check (`/api/internal/tls-allow`), and apps on
  `APPS_DOMAIN` reaching the studio or each other.
- **Published apps:** visitor-supplied data running as script in an app page
  or in the dashboard (cross-site scripting).
- **Backups and exports:** backups, app exports or releases that leak
  secrets or other customers' data.

## What's out of scope

- Problems that need an already-compromised server, a stolen operator
  password, or physical access.
- Outdated installations: please check the latest release first.
- Denial of service by sheer volume, and missing security headers or
  best-practice settings without a demonstrated attack.
- Problems in services Nullkode connects to (Stripe, your AI provider, your
  email provider) and in the optional command-line AI tool: please report
  those to their makers.
- Social engineering and phishing of maintainers or users.

Known advisories in third-party packages that can't be reached in Nullkode
are listed, with reasons, in
[docs/security-audit-exceptions.md](docs/security-audit-exceptions.md).
