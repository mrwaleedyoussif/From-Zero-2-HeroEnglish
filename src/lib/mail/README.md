# lib/mail

Mail adapter (SPEC §12, rule 5). `getMailer()` picks the provider from `MAIL_PROVIDER`:
`console` (default; logs only), `resend` (needs `RESEND_API_KEY`, sends from `MAIL_FROM`) or
`gmail` (the Owner's Gmail through the Google connection; needs the `gmail.send` scope).
The daily budget (`EMAIL_DAILY_BUDGET`, default 90) is enforced by the scheduler with `email_log`.
