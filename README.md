# licensegemini.com

The Gemini licensing inquiry site. One file, `index.html`, published by GitHub Pages from the `main` branch. Any change pushed to `main` goes live within a minute or two.

## How inquiries reach you

The form sends each inquiry through Web3Forms, which emails it to info@licensegemini.com. Replying to that email replies to the applicant.

To connect it:

1. Go to web3forms.com, enter info@licensegemini.com, and request an access key. It arrives by email.
2. In `index.html`, find `WEB3FORMS_KEY: "",` near the bottom and paste the key between the quotes.
3. Commit the change.

While the key is empty the site runs in preview mode: the form works on screen but nothing is sent.

The free plan allows 250 submissions a month.

## Meeting requests

Visitors can request a 30-minute time on January 6, 7 or 8. Nothing is held automatically. The request arrives in the email, and you confirm or propose another time by reply.

To stop a time being requested again (a confirmed meeting, lunch, a break), add it to `BLOCKED_SLOTS` in `index.html`:

`BLOCKED_SLOTS: ["2027-01-06T10:30", "2027-01-07T12:00"],`

## Domain

In GoDaddy's DNS settings for licensegemini.com, remove any existing A record named `@` and CNAME named `www`, then add:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | yoetzet-sca.github.io |

Leave MX and TXT records alone; they run your email.

Then in this repository go to Settings > Pages, enter `licensegemini.com` under Custom domain, save, and tick Enforce HTTPS once it becomes available.

## Changing things later

Categories, regions, meeting days and hours are in the `CONFIG` block near the bottom of `index.html`.
