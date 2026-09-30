# Miseora

Snap your fridge, find something delicious. Miseora recognises the ingredients in a photo of your fridge, shows the recipes you can make with them, and helps you plan, shop and cook.

**Features:** fridge photo scan → recipe matches, recipe discovery and favourites, your own recipes and a community feed, meal planner, shopping list, guided cooking with timers, English / Dutch / French / Spanish, light and dark mode, Supabase accounts, optional Stripe subscription.

**Built with:** [vinext](https://github.com/cloudflare/vinext) (Next.js on Vite) running on Cloudflare Workers, Cloudflare D1 (database) and R2 (photo storage), Supabase (sign-in), OpenAI API (photo recognition and recipe ideas), Stripe (payments).

## Run it on your computer

Requires Node.js 22.13 or newer.

```bash
npm install -g pnpm
pnpm install
cp .dev.vars.example .dev.vars   # then fill in at least SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
pnpm dev                         # http://localhost:3000
```

The local database creates its tables automatically on first use.

## Put it online (Cloudflare)

You need a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.

1. **Log in to Cloudflare**
   ```bash
   npx wrangler login
   ```
2. **Create the database** and copy the `database_id` it prints into `wrangler.jsonc`:
   ```bash
   npx wrangler d1 create miseora-db
   ```
3. **Create the photo storage bucket**
   ```bash
   npx wrangler r2 bucket create miseora-uploads
   ```
4. **Add your keys** (each command asks you to paste the value):
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
   npx wrangler secret put OPENAI_API_KEY
   ```
   Optional: `SITE_URL`, `ADMIN_USER_ID`, `SUPPORT_EMAIL`, `OPENAI_VISION_MODEL`, and the Stripe values listed in `.dev.vars.example`.
5. **Deploy**
   ```bash
   pnpm run deploy
   ```
   The site is live at the `*.workers.dev` address it prints. To use your own domain, open the worker in the Cloudflare dashboard → Settings → Domains & Routes.
6. **Point Supabase at your site.** In Supabase → Authentication → URL Configuration, set **Site URL** to your address and add `https://<your address>/auth/finish` to **Redirect URLs**.

After signing in, the `/setup` page shows which connections are working and walks through Stripe, the owner dashboard and the launch checklist.

## Useful commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Local development server |
| `pnpm build` | Production build |
| `pnpm preview` | Run the production build locally |
| `pnpm run deploy` | Build and publish to Cloudflare |
| `pnpm lint` / `pnpm typecheck` | Code checks |
| `pnpm db:migrate` | Apply `drizzle/` migrations to the online database (optional: tables are also created automatically) |

## Project layout

- `app/` — pages, components and API routes (`app/api/*`)
- `lib/` — recipes, recipe matching, translations, Supabase, Stripe and AI helpers
- `db/`, `drizzle/` — database schema and migrations
- `public/` — images, fonts and logo
- `wrangler.jsonc` — Cloudflare settings (database, storage, public variables)
