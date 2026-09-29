# Deleting data: apps, accounts and the people who use your apps

This page explains what happens to data when an app or an account is
deleted, how the people who use an app can download or delete their own
data, and how an app's owner answers privacy requests. The code lives in
`src/lib/erase.ts` (apps and accounts) and `src/lib/app-account-data.ts`
(one person's data inside an app).

## Deleting an app

The trash button on an app card opens a short confirmation: *Deletes the
app, its data and its files. Download a backup first.* Deleting an app:

| What | What happens |
| --- | --- |
| Its tables (the `proj_<id>` schema: sign-ups, bookings, messages…) | Renamed to `trash_proj_<id>_<yyyymmdd>`; the nightly clean-up drops it after 7 days |
| Its phone-app builds (`<private uploads>/<id>/`) | Moved to `<private uploads>/.trash/<yyyymmdd>/<id>/`, removed after 7 days |
| A copied website's pictures (`public/assets/cloned/<slug>/`) | Moved to the same trash folder, unless another app (an imported copy, say) still uses them |
| Its Google Play upload key | Deleted. Its passwords go with the app's record, so the file alone is useless. An app with a key can only be deleted after the owner confirms they downloaded it |
| Its pages, workflows and their run logs, table records, domains, published versions | Deleted with the app |
| Its privacy log and deletion requests | Deleted with the app |
| Files people uploaded (`public/uploads`) | Kept. They're shared between apps (an imported copy points at the same files) |
| Outside databases and Google Sheets | Never touched |

`<private uploads>` is `NK_NATIVE_DIR`, or the `uploads` folder next to the
app when that isn't set. Within the 7 days an operator can bring an app's
tables back by renaming the schema, but the app itself (pages, workflows)
comes back only from a backup: download one first.

The same eraser runs when an account is deleted and when creating an app
from a template or importing a backup fails halfway.

## Deleting an account

- **Your own:** Billing, *Delete my account*. Type your email to confirm.
  Your subscription is cancelled at once, every app you own is erased as
  above, then your account goes. The page lists each app's backup (and upload
  key, for apps on Google Play) so you can download them first. Someone who
  runs a reseller workspace, or the only operator, can't delete their account
  here.
- **The operator:** Admin, Users, *Delete*. Shows the apps that go and any
  upload keys, and asks for the person's email. If their subscription can't
  be cancelled with the payment provider, nothing is deleted; cancel it in the
  payment dashboard, tick the box and try again.
- **A reseller:** Clients, delete. Cancels the client's subscription on the
  reseller's own payment account first.

If the subscription can't be cancelled, nothing is deleted. Each deleted
account is recorded in the `erasure.log` setting as a SHA-256 of its email
address, the date and who did it (newest 1000), so a restored backup can be
checked against it without keeping the address itself.

## The people who use an app

Apps with sign-in (the *Sign-in and accounts* feature, version 1.1.0) have
two sections on the profile page:

- **Download my data:** a `.zip` with the person's account and everything
  tied to it, as `.json` and `.csv` files. Passwords are never included.
- **Delete my account:** they enter their password and type DELETE. Their
  account and everything they added while signed in (profile, favourites,
  posts) is deleted. Bookings, orders or messages sent with their email are
  kept for the business, with their name and contact details removed. It
  also removes this device's push notification subscription and signs them
  out.

Every published app also has a public page at **`<app address>/delete-account`**
(for example `https://yourapp.example.com/delete-account`, or
`https://your-studio.example.com/app/<slug>/delete-account`). Google Play asks
for this address in the store listing; the Data tab shows it with a copy
button. On that page a signed-in person can download or delete as above, and
anyone who can't sign in can ask by email:

- with email set up on the server, they get a link that works for 24 hours,
  and confirming it deletes the account;
- without email, the request waits in the owner's Data tab, under *Privacy
  requests*, for the owner to approve.

The answer is the same whether or not the email has an account, so the form
can't be used to find out who uses an app. Requests are rate limited.

**Known limit:** sessions are signed tokens with no list on the server, so
another phone or computer where the person is still signed in stays signed
in until that session expires (30 days), although the account behind it is
gone. Fixing this needs a change in the flow runtime (return no session when
the account row is missing).

## Privacy requests (the Data tab)

When someone asks what an app keeps about them, or asks for it to be
deleted, the owner opens **Data, Privacy requests**:

- **Find a person** by email or phone. Results are grouped by table ("1
  account, 3 bookings, 1 contact form message"), with rows that only mention
  them listed separately for the owner to check.
- **Download a copy** gives the same kind of `.zip` as above.
- **Erase** shows what will go, lets the owner keep rows they need for their
  records (orders, invoices) with only the personal details removed, then
  deletes the rest and clears what was sent in workflow logs that mention them.
- Google Sheets and outside databases are listed as *check these yourself*:
  the app can only read them.
- **The request log** keeps each request's type, when it arrived, when it's
  due (30 days) and when it was done, never the person's details. Requests
  made in the app, through the emailed link or through the delete-account
  page are logged automatically.

## Scripts for existing installs

Both report only, unless run with `--apply`. Run them against the right
database: they print which one they use.

```bash
# Tables and build folders left by apps deleted before the eraser existed.
# --cloned also checks copied-website folders nothing uses.
DATABASE_URL=… node_modules/.bin/tsx scripts/erase-orphans.ts [--cloned] [--apply]

# Add Download my data / Delete my account to the profile page of apps whose
# sign-in feature was installed before version 1.1.0 (draft and live version).
# Restart the server afterwards: it caches published versions.
DATABASE_URL=… node_modules/.bin/tsx scripts/upgrade-account-deletion.ts [--apply]
```

`erase-orphans --apply` renames and moves things to the trash (removed after
7 days by the nightly clean-up); it refuses to run against a database with no
apps at all unless given `--allow-empty-database`.
