# Send email from your platform

NullKode sends a handful of emails for you:

- password reset links and invitations (for you, your resellers and their
  clients);
- alerts to app owners when someone sends a form or makes a booking in their
  app;
- the emails apps send themselves, with the **Send email** step in a flow
  (booking confirmations, receipts, sign-up codes).

Email is optional. Until it's set up, invitation and password links are shown
on screen so you can pass them on, and apps skip their email steps (the
owner sees a note about it on the app's overview and in the flow's
Activity tab).

## Set it up

Administration → Settings → **Email**.

1. Choose **Any email provider (SMTP)**. Every major provider offers SMTP,
   including Resend, Brevo, Mailgun, Postmark and Amazon SES. The **Resend**
   choice is there for installs that already use a Resend API key.
2. Fill in the server, port, username and password your provider gives you
   (see the examples below).
3. **Send from:** an address your provider lets you send from, such as
   `hello@yourbusiness.com`.
4. **Sender name** (optional): shown as the sender. Leave it blank and each
   email uses your brand name, or the app's name for app emails.
5. Press **Send a test email to me**. It sends to your own admin address using
   what's on screen, before you save, and tells you exactly what went wrong
   if it fails.
6. Press **Save email settings**.

The Email card then shows how many emails were sent and how many failed in
the last 24 hours, and the last problem, in plain words.

### Which port?

Use **587** unless your provider says otherwise. It starts plain and switches
to encryption (STARTTLS) straight away. Port **465** is encrypted from the
first byte: pick *465 (SSL)* and the encryption setting follows. Port
**2525** is an alternative some providers offer when 587 is blocked.

Many hosting companies and cloud providers block outgoing port **25**, and
some block 587 and 465 on new servers until you ask. If the test says
*Couldn't reach the email server*, try another port or ask your host to
unblock it.

## Provider examples

| Provider | Server | Port | Username | Password |
|---|---|---|---|---|
| Resend | `smtp.resend.com` | 587 or 465 | `resend` | your API key |
| Brevo | `smtp-relay.brevo.com` | 587 | your SMTP login (SMTP & API page) | your SMTP key |
| Mailgun | `smtp.mailgun.org` (EU: `smtp.eu.mailgun.org`) | 587 | the SMTP user for your domain | its SMTP password |
| Postmark | `smtp.postmarkapp.com` | 587 | your Server API token | the same token |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | 587 | SES SMTP username | SES SMTP password (not your AWS keys) |
| SendGrid | `smtp.sendgrid.net` | 587 | `apikey` | your API key |
| Google Workspace / Gmail | `smtp.gmail.com` | 587 | your full email address | an app password |
| Microsoft 365 | `smtp.office365.com` | 587 | your full email address | your password (SMTP sign-in must be allowed for the mailbox) |
| Your web host's mailbox | usually `mail.yourdomain.com` | 587 or 465 | the full email address | the mailbox password |

Notes:

- **Google** needs 2-Step Verification and an *app password*; your normal
  password is refused. Google also limits how many emails an account can send
  per day, so a sending service is better once your platform grows.
- **Microsoft** is phasing out password sign-in for SMTP on many tenants. If
  the test says the password was rejected even though it's right, use a
  sending service such as Brevo or Postmark instead.
- Sending services ask you to **verify your domain** by adding a few DNS
  records (SPF and DKIM, often DMARC too). Do it: without them, a lot of email
  lands in spam or is refused.

## Who emails appear to come from

Every email is sent from your **Send from** address. When an app's flow asks
for a different sender, for example `bookings@thebakery.com`:

- if it's on the same domain as your Send from address, it's used as is;
- otherwise your Send from address is used, and the app's address becomes
  the **reply-to**, so replies still reach the app owner.

This stops apps on your platform from sending email that pretends to come
from someone else, which providers refuse anyway.

## Using the server's settings file instead

You can also set email in the `.env` file and restart. Settings saved in the
admin screen take over from these.

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
# true = SSL from the start (port 465). Leave empty for automatic.
SMTP_SECURE=
SMTP_USER=you@example.com
SMTP_PASSWORD=your-smtp-key
SMTP_FROM="Your Brand <hello@yourbusiness.com>"
```

Older installs that use Resend's API keep working:

```
RESEND_API_KEY=re_...
DEFAULT_EMAIL_FROM="Your Brand <hello@yourbusiness.com>"
```

## Trying it without a real mailbox

[Mailpit](https://mailpit.axllent.org/) catches every email and shows it in
your browser, which is handy on a test install:

```
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit
```

Then use server `host.docker.internal` (when NullKode runs in Docker) or
`127.0.0.1` (when it doesn't), port **Another port → 1025**, no username or
password, and any Send from address. Open `http://localhost:8025` to read the
emails. Nothing leaves your computer.

## When the test fails

| Message | What to do |
|---|---|
| The email server rejected the username or password. | Check both. Google and Microsoft need an app password; SMTP services use an SMTP key, not your account password. |
| Couldn't reach the server on port … | The port is blocked or wrong. Try 587, then 465, then 2525, or ask your host to open it. |
| Couldn't connect … nothing answered there. | The server address or port is wrong. |
| The email server name … couldn't be found. | A typo in the server address. |
| The port and the encryption setting don't match. | Use 465 with SSL, or 587 with automatic encryption. |
| The email server refused to send from … | Your provider hasn't verified that sender address or its domain. Verify it, or send from an address it knows. |
| Resend hasn't verified the sender address … | Verify the domain in Resend, or send from an address on a verified domain. |
| Resend's test mode only sends to … | A new Resend account can only email its own address until you verify a domain. |
