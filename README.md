# Miseora

Cook something good, step by step. Miseora has easy recipe tutorials, shows which recipes you can make with the ingredients you have, and lets you create and share recipes of your own.

**Features:** step-by-step cooking tutorials (amounts that follow the servings, parallel timers with an alarm, “ready when” checks), a fridge with ingredient suggestions as you type and a browse-all list, “recipes you can make” matching, a recipe editor with a completeness check, favourites, community recipes and reviews, meal planner and shopping list, English / Dutch / French / Spanish, light and dark mode, Supabase accounts, optional AI recipe ideas and optional Stripe subscription.

**Built with:** [vinext](https://github.com/cloudflare/vinext) (Next.js on Vite) running on Cloudflare Workers, Cloudflare D1 (database) and R2 (recipe photo storage), Supabase (sign-in), optional OpenAI API (recipe ideas), optional Stripe (payments).

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
3. **Create the storage bucket for recipe photos**
   ```bash
   npx wrangler r2 bucket create miseora-uploads
   ```
4. **Add your keys** (each command asks you to paste the value):
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
   npx wrangler secret put OPENAI_API_KEY      # optional: AI recipe ideas
   ```
   Optional: `SITE_URL`, `ADMIN_USER_ID`, `SUPPORT_EMAIL`, and the Stripe values listed in `.dev.vars.example`.
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
- `lib/` — starter recipes, ingredient list, amounts and step formatting, recipe matching, translations, Supabase, Stripe and AI helpers
- `db/`, `drizzle/` — database schema and migrations
- `public/` — images, fonts and logo
- `wrangler.jsonc` — Cloudflare settings (database, storage, public variables)
