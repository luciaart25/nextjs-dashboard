## Next.js App Router Course - Starter

This is the starter template for the Next.js App Router Course. It contains the starting code for the dashboard application.

For more information, see the [course curriculum](https://nextjs.org/learn) on the Next.js Website.

## Neon + Vercel setup

Set one pooled Neon connection string for app queries:

- `POSTGRES_URL`
- or `DATABASE_URL`

Set one direct Neon connection string for seed/schema work:

- `POSTGRES_URL_NON_POOLING`
- or `DATABASE_URL_UNPOOLED`

After the environment variables are configured in Vercel, trigger these routes:

- `/seed` to create/update demo tables and seed data
- `/query` to verify the seeded invoice query works

`/seed` is intentionally public in this starter project so it is easy to test. For a real production app, protect or remove it after seeding.
