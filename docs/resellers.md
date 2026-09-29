# Resellers: sell the platform under someone else's brand

Four levels work out of the box:

1. **You, the operator** — you run the server.
2. **Resellers** — agencies that sell app building to their own customers,
   under their own name, logo, colours and web address.
3. **App owners** — the reseller's customers (or yours). They build apps.
4. **App users** — the people who use those apps.

## Add a reseller (operator)

Administration → **Resellers** → *Add a reseller*:

- The agency's name and the email of the person who runs it.
- Optional limits: how many customers, how many apps in total, and how many
  AI actions a month the agency and all its customers can use together.

You get an invitation link (it's also emailed if email is set up). The
reseller opens it, chooses a password and lands in their **Reseller
dashboard**. You can suspend or delete a reseller at any time; their
customers keep their accounts and apps as your direct customers.

## What the reseller sets up

The Reseller dashboard has a short checklist:

- **Branding** — name, logo, browser icon, colours and a help email, with a
  live preview. Their customers never see your brand.
- **Domain** — e.g. `apps.youragency.com`. They add two DNS records the
  screen shows (a CNAME to this server and a TXT record to prove they own
  the domain) and press *Check now*. On installs with automatic HTTPS the
  certificate is issued on the first visit.
- **Billing & plans** — their own Stripe account: secret key, the webhook
  address shown on the screen (`/api/stripe/webhook/r/<their id>`), and a
  Stripe price for each plan. Customers pay the reseller directly. They
  also decide what each plan includes (apps, published apps, pages, own
  domains, AI actions) and whether new customers can sign themselves up.
- **Clients** — invite customers by email, pick their plan, reset their
  password, suspend them, or open their workspace to help them (a banner
  shows while they're inside, and *Back to your clients* ends it).

## What the reseller's customers get

They sign up or sign in at the reseller's domain and see only the
reseller's brand: sign-in pages, emails, the builder, and the apps they
publish. Their apps can use their own domains too.

## Your share

Reseller customers pay the reseller's Stripe account; the platform takes no
fee. Charge resellers the way you like (for example a monthly fee on your own
Stripe account), and use the limits above to match what they pay for.

## Good to know

- Set `APPS_DOMAIN` (see START-HERE.md) so every published app gets its own
  web address. With resellers, pick a neutral domain (for example
  `myapps.site`) so their customers' app addresses don't show your brand.
- Everything a reseller can do is limited to their own customers. They can't
  see your other customers, other resellers, or your settings.
