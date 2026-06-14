# Database SQL

These scripts are applied **manually** in the Supabase SQL editor — nothing in
the app runs them automatically, and there is no migration tool wiring them
together. They're kept here as a record of the schema's history.

Because they were pasted by hand over time, the filenames are not a strict
ordering. Treat each as "already applied" unless you're spinning up a fresh
Supabase project, in which case apply `schema/` first, then `migrations/`.

## Layout

- `schema/` — base table definitions (start here for a fresh project)
  - `supabase-schema.sql`, `itinerary-schema.sql`, `itinerary-public-read.sql`
- `migrations/` — incremental additions (new columns, tables, features)
  - `add-*`, `setup-*` (notifications / push), `create-place-cache-table.sql`
- `fixes/` — one-off hotfixes applied to live data (trigger/RLS repairs)
  - `fix-*`, `disable-all-triggers.sql`
- `diagnostics/` — throwaway inspection queries / scripts, not schema changes
  - `check-*.sql`, `check_friendships.js`

> Note: `web/public/setup-supabase.sql` is a separate, self-contained setup
> bundle served by the web app and is intentionally left in place.
