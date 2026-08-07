# Database scripts

SQL for the Supabase project behind 404tools accounts, the prepaid page-pack
billing, and the OCR API.

**The target Supabase project (`bpqvpdxbkoyydczoucek`) is not linked to the
Supabase CLI account this machine is logged into.** There is no
`supabase db push` path here. Run these by hand.

Every script is idempotent — `IF NOT EXISTS`, `CREATE OR REPLACE`, and
`DROP POLICY IF EXISTS` before each `CREATE POLICY` — so re-running a script, or
the whole set, is safe and is the normal way to apply a change.

## Run order

Run them in numeric order. Later scripts reference tables created by earlier
ones, so skipping ahead fails.

| # | File | Creates |
|---|------|---------|
| 1 | `001_profiles.sql` | `profiles` table, RLS, `handle_new_user()` trigger on `auth.users`, `set_updated_at()` touch trigger |
| 2 | `002_ocr_billing.sql` | page-balance columns on `profiles`, `page_purchases` table, `ocr_consume_pages()` and `ocr_add_pages()` |
| 3 | `003_api_keys.sql` | `api_keys` table (sha256 hashes only) |
| 4 | `004_ocr_usage.sql` | `ocr_usage` table and the `ocr_usage_daily()` rollup |
| 5 | `005_billing_integrity.sql` | column-level `UPDATE` lockdown on `profiles`, `page_purchases.refunded_at`, `ocr_record_purchase()` and `ocr_revoke_pages()` |

## How to run

### Supabase SQL editor (recommended)

1. Open the project dashboard, then **SQL Editor → New query**.
2. Paste the entire contents of one file.
3. **Run**. Confirm "Success" before moving to the next file.

Paste one file per query. Running all five in a single editor tab works, but a
failure part-way through is much harder to read.

### psql

Copy the connection string from **Project Settings → Database → Connection
string → Session pooler**, then:

```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/001_profiles.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/002_ocr_billing.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/003_api_keys.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/004_ocr_usage.sql
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f scripts/005_billing_integrity.sql
```

The database password is not the service-role key and is not stored in the repo.
`SUPABASE_DB_URL` is a local convenience only — it is not read by the app and
does not belong in `.env.local`.

## What each script unlocks

**`001_profiles.sql`** — signup, login, password reset, and the dashboard
session. Needs `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`.

The `handle_new_user` trigger is the important part: it inserts the profile row
in the same transaction as the auth user. The signup action then sets the
display name with an `UPDATE`, which would silently affect zero rows if the
profile did not already exist.

**`002_ocr_billing.sql`** — checkout and the Paddle webhook. Needs
`PADDLE_ENVIRONMENT`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`,
`NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `NEXT_PUBLIC_PADDLE_ENVIRONMENT`, and the
four `PADDLE_PAGES_PRICE_ID_*` ids.

`ocr_consume_pages` and `ocr_add_pages` are `SECURITY DEFINER` with `EXECUTE`
revoked from `anon` and `authenticated`, so **only the service role can call
them**. That is deliberate: an OCR request authenticates with a Bearer API key
and has no Supabase session, so `auth.uid()` is always `NULL` on that path and
the user id has to be passed in as an argument instead.

**`003_api_keys.sql`** — the dashboard's API-key management and the Bearer
authentication on `/api/v1/*`. Only the sha256 hash of a key is stored, so a
leaked row cannot be replayed as a credential.

**`004_ocr_usage.sql`** — the usage page and its chart. The OCR route itself
needs `AZURE_DOCINTEL_ENDPOINT`, `AZURE_DOCINTEL_KEY`, and optionally
`AZURE_DOCINTEL_API_VERSION` (defaults to `2024-11-30`).

**`005_billing_integrity.sql`** — the money path's exactly-once guarantees. It
revokes column-level `UPDATE` on `profiles` from `anon` and `authenticated` and
grants back only `full_name`, because RLS scopes an update to a row and never to
a column: without this a logged-in browser could PATCH its own `pages_balance`.
`ocr_record_purchase` records a purchase and credits it in one transaction, so a
webhook failure can never leave a customer charged but uncredited, and
`ocr_revoke_pages` reverses a refund without inflating `pages_used_total`.

## Verifying

After all five have run:

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
-- expect: api_keys, ocr_usage, page_purchases, profiles

select routine_name from information_schema.routines
where routine_schema = 'public'
order by routine_name;
-- expect: handle_new_user, ocr_add_pages, ocr_consume_pages,
--         ocr_record_purchase, ocr_revoke_pages, ocr_usage_daily,
--         set_updated_at
```

Then sign up a real account and confirm a `profiles` row appeared with
`pages_balance = 0`. A new account is meant to have zero pages and stay behind
the paywall until it buys its first pack.
