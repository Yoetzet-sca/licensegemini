# Putting licensegemini.com live

Three files:

- `index.html` is the whole website.
- `backend/Code.gs` is the backend. It runs inside a Google Sheet and saves each inquiry as a row.
- `README.md` is this guide.

Allow about 20 minutes. You need a Google account (ideally the one behind info@licensegemini.com) and access to wherever the licensegemini.com domain is managed.

## 1. Create the sheet and backend

1. Go to sheets.new and name the sheet "Gemini licensing inquiries".
2. In the menu choose Extensions > Apps Script.
3. Delete everything in the editor, paste in the full contents of `Code.gs`, and save.
4. In the function dropdown at the top pick `setup`, click Run, and approve the permission prompts. Google asks for access to this spreadsheet and to send email as you; the email permission is for the new-inquiry alerts.
5. Click Deploy > New deployment. Click the gear and choose Web app. Set:
   - Execute as: Me
   - Who has access: Anyone
6. Click Deploy and copy the Web app URL. It ends in `/exec`.

## 2. Connect the website

1. Open `index.html` in a text editor.
2. Find the line `API_URL: "",` near the bottom and paste the URL between the quotes:
   `API_URL: "https://script.google.com/macros/s/.../exec",`
3. Save.

## 3. Publish the website

The site is published by GitHub Pages from this repository. Any change pushed to the `main` branch goes live within a minute or two.

To use the licensegemini.com address, add these DNS records where the domain is registered:

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | yoetzet-sca.github.io |

Then in the repository go to Settings > Pages, enter `licensegemini.com` under Custom domain, save, and tick Enforce HTTPS once it becomes available.

## 4. Test before CES

1. Open licensegemini.com on your phone and submit a test inquiry with a meeting time.
2. Check that a row appears in the sheet and that an alert reaches info@licensegemini.com.
3. Reload the site: the time you picked should be struck through.
4. In the sheet, change that row's Meeting status to Cancelled and reload the site: the time should be open again.
5. Delete the test row.

## Reviewing inquiries

Each inquiry is one row. Two columns are yours to change:

| Column | Values | What it does |
|---|---|---|
| Review status | New, Approved, Declined | Your own tracking. The site ignores it. |
| Meeting status | Held, Confirmed, Cancelled, No meeting | Held and Confirmed block the slot on the site. Cancelled frees it. |

The sheet does not email applicants. When you confirm or cancel a meeting, reply to them yourself; replying to the alert email goes straight to the applicant.

To block a time for yourself (lunch, a staff break), add it to `BLOCKED_SLOTS` in `index.html`, for example `["2027-01-07T12:00", "2027-01-07T12:30"]`.

## Changing things later

- Categories, regions, meeting days and hours are in the `CONFIG` block near the bottom of `index.html`.
- If you change days or hours, make the same change at the top of `Code.gs`.
- After any edit to `Code.gs`, use Deploy > Manage deployments > Edit > Version: New version > Deploy. The URL stays the same.
