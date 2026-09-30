# Simmerfolk continuation status — 2026-09-29

## Canonical project

- Existing site: https://simmerfolk.henrytjehh6.chatgpt.site
- Project ID: appgprj_6ab8fda6508c8191861757a21e12871a
- Preserve this site, its audience, source repository, design, and existing account data.
- The user requested continuation after a usage-limit interruption; do not rebuild.
- Prior published source was 25ba0f7267640c73ef20759aef097d5eb832bea5.
- The interrupted conversation's uncommitted files were recovered in this checkout.

## Present in the recovered implementation

- Recipe discovery, favourites, fridge ingredients, recipe editor/import, community publishing, meal planner, shopping list, guided cooking and timers.
- Chewy/Nunito typography, playful logo, light/dark themes, photo motion, scroll-controlled cooking story and manual stage controls.
- English, Dutch, French, Spanish; persisted site language and translated interface/starter instructions.
- Eight labelled starter recipes. Community recipes are real user publications, never fabricated posts.
- Supabase email/password, Google/Apple provider hooks, confirmation, recovery, sign-out and authenticated account gating.
- Stripe checkout, customer portal and signature-verified subscription webhook code.
- Owner moderation endpoints and /setup connection instructions.
- Existing starter-recipe edit visibility fix: editing/publishing/deletion require a truthy owner matching the signed-in user.

## Changes after recovery

- Cooking completion stays open if saving history fails.
- Returning from guided cooking stops its timer.
- Dynamic translated planner questions handle punctuation and weekday case.
- History dates follow the selected locale.
- Added missing translated alt text, import errors, editor placeholders and password errors (558 dictionary entries).
- Login accepts existing shorter passwords; signup/reset retain the 12-character minimum.
- Cooking story avoids automatic scroll changes with reduced-motion preference.
- Narrow mobile navigation spacing improved.

## Verification and limits

- Initial and post-edit TypeScript checks passed; final check and production build run in publishing workflow.
- All translation entries have three nonempty translations; all eight starter titles, descriptions and instruction sets covered.
- Dynamic Dutch/French planner labels and translated React accessibility labels checked.
- git diff --check passed.
- Supervised preview reports running, but HTTP access returned 502; page and API checks were therefore NOT completed.
- Browser control skill unavailable in this session; no new browser interaction QA claimed.
- Previous chat reported testing saving/search/favourites/steps/timer; these are historical reports, not a substitute for current live testing.

## Remaining connections and launch work

Production environment had zero configured entries on inspection. Do not claim any provider is live.

1. Connect the intended Supabase project, set SITE_URL, configure confirmation/SMTP and redirect URLs, then test email and each enabled OAuth provider.
2. Decide how existing ChatGPT review identities should migrate before switching auth; IDs are not automatically merged.
3. Securely configure OPENAI_API_KEY in server settings, then test ingredient scans and generated recipes. The user declined the OpenAI Developers plugin; do not suggest it again.
4. Configure Stripe test keys, recurring price, webhook secret and portal. Keep payments disabled until end-to-end tests pass. Private site access currently blocks external webhook delivery; preserve audience unless the user authorizes a change.
5. Configure ADMIN_USER_ID and support contact, finish business/privacy/terms details, account deletion and moderation readiness.
6. Perform browser/mobile interaction QA and real provider tests before public launch.

Do not reuse a Supabase key from an unrelated geography project. Do not invent credentials, community activity, or successful payment/sign-in tests.

## September 30 continuation

- Added a scroll-driven pan scene with generated ingredient sprites, staggered drops, subtle heat and steam, manual stage controls, reduced-motion support and a persistent pause control. A quieter version decorates the page background.
- All eight starter recipes have optimized AI-generated serving images; the home screen shows all eight.
- Simplified homepage copy and folded recipe steps, reviews, privacy and terms into expandable sections. Policies remain honest private-review drafts pending operator details.
- Added real upload percentage and a spinner, automatic recognition, editable ingredient review, qualitative uncertainty and alternatives, manual corrections, cancellation and retry handling. Confirmed ingredients save atomically with stable IDs.
- Added strict structured vision response validation and an image audit prompt. Vision model is configurable through OPENAI_VISION_MODEL. Live recognition remains unavailable until OPENAI_API_KEY is configured. No claim of universal or perfect ingredient recognition.
- Current preview browser access works. Visually checked generated images, scroll scene and Prep/Simmer controls, and collapsed terms. This supersedes the earlier preview-access limitation above.
- Production account/provider and live AI tests are still outstanding; do not claim those flows are live.

## September 30 — onboarding and motion polish

- Replaced the optional three-step signed-in form with an automatic seven-step first-visit onboarding: language, cuisines, dietary preferences/avoided ingredients, time, experience/portions, equipment, review.
- Guest answers persist on the device; authenticated answers use the existing profile endpoint. Welcome completion/dismissal is versioned and scoped by identity. Preferences can be reopened from the homepage or profile.
- Home recommendations rank by time and cuisines, filter declared dietary tags/obvious ingredient exclusions, and use chosen servings when opening a recipe. This is not allergy certification. Discover retains the full catalog.
- Added eight staggered ingredient pieces, smooth scroll interpolation, a pan-toss interaction and onboarding pan progress. Pause/reduced-motion controls remain supported.
- Scanner now shows the unavailable connection before upload and can recheck configuration. No credentials were supplied: photo recognition remains OFF. Do not claim it was enabled. The required trusted API-key setup skill was absent; do not create keys through an improvised flow or request raw secrets in chat.
- Browser QA: automatic welcome, all seven steps, selection/portion changes, final save, refresh persistence, personalized recipes (vegan + peanut avoidance), and interactive pan-toss state checked. Signed-in persistence uses existing API and has not been live-provider tested.

## September 30 — connected recognition diagnosis

- OPENAI_API_KEY was saved as a secret and deployed with environment revision 4.
- User scans at approximately 13:08 UTC reached OpenAI but returned 429. Original code logged only status; credit/quota versus transient rate-limit subtype was not captured, so do not claim a confirmed billing cause.
- Added safe provider error-code/request-ID logging and specific UI messages for credits, spending/usage limits, invalid key, model access and temporary service failures.
- Temporary rate limits/5xx receive at most one bounded server retry; provider Retry-After delays over eight seconds are returned to the UI. Billing/quota errors never auto-retry. The scan-again control honours a returned cooldown.
- Mocked-provider checks passed for quota no-retry, transient retry-success, authentication and delay parsing. Successful live recognition still needs verification; do not invent API credits or alter user billing.

## September 30 — Miseora rename and scan-to-recipes

- Renamed the visible brand from Simmerfolk to Miseora (logo artwork in `public/images/miseora-logo*.png`, favicon, page title, footer, translations, starter recipe author). The hosted domain, project ID and internal storage keys (`simmerfolk-*`) are unchanged so existing visitors keep their settings.
- A fridge scan now finds recipes: after confirming scanned ingredients, the scanner shows recipes ranked by how much of each is already in the fridge, with what is still needed. The fridge page shows the same "Recipes you can make" list. Matching lives in `lib/recipe-match.ts` (pantry basics such as water, salt and oil never count as missing).
- The vision scan now also returns an English `matchName` per ingredient, stored with fridge items, so Dutch/French/Spanish scans still match recipes.
- Checked locally with a mocked recognition response: review, save, recipe matches, opening a recipe, fridge page, dark mode and mobile. Live recognition still depends on the OpenAI account (see 429 diagnosis above).

## September 30 — deploy readiness

- Database tables are now created automatically on first use (`ready()` in `lib/server.ts`, same schema as `drizzle/0000_exotic_alex_power.sql`), so a fresh D1 database no longer fails with "no such table".
- Fixed React missing-key warnings caused by the translation helper re-wrapping children arrays.
- `pnpm lint` passes with 0 errors: removed unused imports/variables, moved `readGuestPreferences` to module scope, and documented three rule adjustments in `eslint.config.mjs`.
- Verified: typecheck, production build, `pnpm start` worker on an empty database, and all 13 pages signed out and signed in with no console or API errors.
