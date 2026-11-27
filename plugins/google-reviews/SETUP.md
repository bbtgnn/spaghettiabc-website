# Google Reviews plugin — credential setup

Operator guide for live sync with **Google Business Profile** (not Places). You will collect every value needed in EmDash under **Plugins → google-reviews → Settings**, starting from a Google login.

For local UI work without Google credentials, skip to [Dev mock sync](#dev-mock-sync).

Official references:

- [Prerequisites](https://developers.google.com/my-business/content/prereqs)
- [Basic setup](https://developers.google.com/my-business/content/basic-setup)
- [Implement OAuth](https://developers.google.com/my-business/content/implement-oauth)
- [Work with location data](https://developers.google.com/my-business/content/location-data)
- [Work with review data](https://developers.google.com/my-business/content/review-data)
- [OAuth 2.0 Playground](https://developers.google.com/oauthplayground)

---

## Before you start

1. Use a **Google Account that is owner or manager** of Flavia’s verified Business Profile (the same account you would use in [Google Business Profile](https://business.google.com/)).
2. Prefer a **verified location** that has been active long enough for API access approval (Google’s prerequisites ask for a verified, active profile for 60+ days and a website on the listing).
3. Have a password manager ready. You will store **Client Secret** and **refresh token** there — never in git.
4. Confirm the site has `EMDASH_ENCRYPTION_KEY` set (local `.env` and Worker secret). Secret settings (`oauthClientSecret`, `refreshToken`) need it. See `DEPLOY.md` and `.env.example`.

---

## 1. Log in to Google

1. Open a private/incognito window (avoids the wrong account).
2. Sign in at [accounts.google.com](https://accounts.google.com) with the Business Profile owner/manager account.
3. Confirm you can open the listing in [business.google.com](https://business.google.com/).

Keep that session for Cloud Console and OAuth Playground.

---

## 2. Create or open a Google Cloud project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select an existing one dedicated to this site).
3. Note the **Project number** from the project Dashboard (needed when requesting API access).

---

## 3. Request Business Profile API access

Business Profile APIs are **not** open by default. The “Google My Business API” entry may be missing or stuck at **0 QPM** until Google approves the project.

1. Follow [Request access to the APIs](https://developers.google.com/my-business/content/prereqs#request-access) in Google’s prerequisites.
2. Submit via Google’s GBP API contact form as **Application for Basic API Access**, using an email that is owner/manager on the Business Profile, and include your **Project number**.
3. Wait for approval. In Cloud Console, quotas for Business Profile APIs around **300 QPM** usually mean approved; **0 QPM** means not yet.

Do not continue to production sync until access is approved. Enabling APIs alone is not enough if the project was never approved.

---

## 4. Enable the Business Profile APIs

After approval, enable the Business Profile APIs for the project. Google’s [Basic setup](https://developers.google.com/my-business/content/basic-setup) lists the associated APIs (including **Google My Business API**, **My Business Account Management API**, and **My Business Business Information API**).

1. Open the [API Library](https://console.cloud.google.com/apis/library).
2. Select your project.
3. Search for and **Enable** each Business Profile API Google lists for your project.
4. If an API does not appear, access may not be approved yet — go back to step 3.

This plugin’s live sync calls `mybusiness.googleapis.com` (reviews) and uses OAuth against `oauth2.googleapis.com`. Account and location discovery use Account Management / Business Information endpoints while you collect IDs.

---

## 5. Configure the OAuth consent screen

1. In Cloud Console, open **APIs & Services → OAuth consent screen**.
2. For a personal Gmail-managed project, choose **External**.
3. Fill in the required app name and support email (site/operator contact is fine).
4. Add the scope later via Playground, or ensure
   `https://www.googleapis.com/auth/business.manage`
   is allowed for the app.
5. **Publishing status:**
   - **Testing:** only emails listed under **Test users** can authorize. Add the Business Profile owner/manager email here.
   - **Important:** while the app stays in Testing, Google refresh tokens for non-basic scopes **expire after 7 days**. For a durable production token, plan to publish the app (and complete any verification Google requires) or re-issue the refresh token when it expires.
6. Save.

Consent screen docs: [Setting up your OAuth consent screen](https://support.google.com/cloud/answer/10311615).

---

## 6. Create an OAuth Client ID (Web application)

1. Open **APIs & Services → Credentials**.
2. **Create credentials → OAuth client ID**.
3. Application type: **Web application**.
4. Name it something like `spaghettiabc-gbp-playground`.
5. Under **Authorized redirect URIs**, add exactly:

   `https://developers.google.com/oauthplayground`

6. Create the client.
7. Copy and store:
   - **Client ID** → plugin setting `oauthClientId`
   - **Client secret** → plugin setting `oauthClientSecret`

If you already have a Web client, edit it and add the Playground redirect URI above.

---

## 7. Obtain an OAuth refresh token

The plugin stores a long-lived **refresh token** and exchanges it for access tokens on sync. Required scope:

`https://www.googleapis.com/auth/business.manage`

You need **offline** access (`access_type=offline`) so Google returns a refresh token.

### Recommended: OAuth 2.0 Playground with your own credentials

Google’s GBP basic-setup Playground snippet uses a client-side flow for interactive API trials. For a **refresh token** you can paste into EmDash, use **your** Web client with a **server-side / offline** Playground config (same pattern as other Google API Playground guides):

1. Open [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
2. Click the **gear** (OAuth 2.0 configuration).
3. Check **Use your own OAuth credentials**.
4. Paste the **Client ID** and **Client secret** from step 6.
5. Set:
   - **OAuth flow:** Server-side
   - **Access type:** Offline  
     (this is what requests a refresh token)
6. Close the configuration panel.
7. Under **Step 1**, in **Input your own scopes**, paste:

   `https://www.googleapis.com/auth/business.manage`

8. Click **Authorize APIs**.
9. Sign in as the Business Profile owner/manager (must be a **test user** if the consent screen is in Testing).
10. Accept the consent screen (you may see an “unverified app” / testing warning — expected in Testing).
11. Under **Step 2**, click **Exchange authorization code for tokens**.
12. Copy the **Refresh token** → plugin setting `refreshToken`.

Notes:

- If no refresh token appears, revoke prior access at [Google Account → Third-party access](https://myaccount.google.com/permissions), force a fresh consent (Playground “prompt” / re-authorize), and try again with Access type **Offline**.
- Using **your own** client credentials matters: Playground’s default demo client auto-revokes tokens quickly.
- The refresh token can manage the Business Profile. Treat it like a password.

---

## 8. Find Account ID and Location ID

Live sync builds a parent path:

`accounts/{accountId}/locations/{locationId}/reviews`

on `https://mybusiness.googleapis.com/v4/...`. The location must be **verified**. The plugin accepts either bare numeric IDs or prefixed forms (`accounts/123`, `locations/456`).

With the **access token** still valid in Playground (Step 2 / Step 3):

### Account ID

1. Send a GET request to:

   `https://mybusinessaccountmanagement.googleapis.com/v1/accounts`

2. In the JSON, find the account you manage. The `name` looks like `accounts/1234567890`.
3. Copy the numeric part (or the full `accounts/...` string) → plugin setting `accountId`.

### Location ID

1. Send a GET request to (replace `{accountId}`):

   `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/{accountId}/locations?readMask=name,title`

   Or list with the wildcard account for locations you manage indirectly:

   `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/-/locations?readMask=name,title`

2. Find the location by `title`. The `name` looks like `locations/9876543210` (sometimes under an account path depending on the response shape).
3. Copy the location id (or `locations/...`) → plugin setting `locationId`.

More detail: [Work with location data](https://developers.google.com/my-business/content/location-data).

Optional smoke test — list reviews for that parent:

`GET https://mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews`

See [accounts.locations.reviews.list](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list).

---

## 9. Optional: Google Maps profile URL

1. Open the public Google Maps place page for the business.
2. Copy the share / profile URL (the public listing people would open).
3. Paste into plugin setting `mapsUri` (**URL profilo Google Maps**).

Used for the homepage “Vedi su Google” link. Business Profile does not give a stable public URL per individual review.

---

## 10. Paste values into EmDash

1. Open the site admin (`/_emdash/admin`).
2. Go to **Plugins → google-reviews → Settings**.
3. Fill:

   | Setting label | Key | What to paste |
   | --- | --- | --- |
   | OAuth Client ID | `oauthClientId` | Web client ID from Cloud Console |
   | OAuth Client Secret | `oauthClientSecret` | Web client secret (`EMDASH_ENCRYPTION_KEY` required) |
   | OAuth refresh token | `refreshToken` | Refresh token from Playground (scope + offline) |
   | Account ID | `accountId` | `123…` or `accounts/123…` |
   | Location ID | `locationId` | `456…` or `locations/456…` (verified) |
   | URL profilo Google Maps | `mapsUri` | Optional public Maps URL |
   | Dev mock sync | `devMockSync` | **Off** for live Google sync |

4. Save.
5. Open the plugin page **Recensioni Google** and run **Sincronizza ora**.

If sync fails, re-check API approval/quotas, consent test user, account/location IDs, and that the location is verified.

---

## Dev mock sync

For local UI work without Google keys:

1. In plugin Settings, enable **Dev mock sync** (`devMockSync`).
2. Leave OAuth / account / location empty if you want.
3. **Sincronizza ora** loads fixture reviews (paginated mock) with no Google calls.

Turn **Dev mock sync off** in staging/production before relying on real reviews.

---

## Security

- Never commit Client Secret, refresh token, or `EMDASH_ENCRYPTION_KEY` to git.
- Store secrets in a password manager; put encryption key in `.env` / Wrangler secrets only.
- A refresh token with `business.manage` can read and manage Business Profile data for the consented account — revoke it from [Google Account permissions](https://myaccount.google.com/permissions) if it leaks or when rotating.
- Prefer a Cloud project used only for this site so credentials are easy to revoke.

---

## Checklist

Copy this and tick as you go:

- [ ] Logged in as Business Profile owner/manager
- [ ] Cloud project created; Project number noted
- [ ] Business Profile API access **approved** (quota not 0 QPM)
- [ ] Business Profile APIs **enabled** on the project
- [ ] OAuth consent screen: External; test user added if Testing
- [ ] Aware of **7-day refresh token expiry** while consent screen is Testing
- [ ] OAuth Web client created; redirect URI `https://developers.google.com/oauthplayground`
- [ ] **OAuth Client ID** copied → `oauthClientId`
- [ ] **OAuth Client Secret** copied → `oauthClientSecret`
- [ ] Playground: own credentials, Server-side, Access type Offline, scope `business.manage`
- [ ] **Refresh token** copied → `refreshToken`
- [ ] **Account ID** from `…/v1/accounts` → `accountId`
- [ ] **Location ID** (verified) from locations list → `locationId`
- [ ] Optional **Maps URL** → `mapsUri`
- [ ] `EMDASH_ENCRYPTION_KEY` present on the site
- [ ] Values pasted in **Plugins → google-reviews → Settings**
- [ ] Live sync: `devMockSync` **off**; **Sincronizza ora** succeeds  
  _or_ local only: `devMockSync` **on**
