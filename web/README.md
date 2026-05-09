# Virgil Web

Next.js 15 SaaS frontend for the Jobclaw / Virgil agent.

## Local dev

```bash
cd web
npm install
npm run dev      # → http://localhost:3000
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → Add New → Project → Import this repo.
3. **Root Directory: `web`**
4. Add Environment Variables (copy from `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Deploy.

## Supabase setup

1. Open SQL editor → paste `supabase/schema.sql` → Run.
2. Storage → create buckets `resumes` and `tailored-docs` (both private).
3. Auth → Providers → enable Google + Email magic link.
4. Auth → URL Configuration → add Vercel URL to redirect allowlist.

## Roadmap

See `../SAAS-PLAN.md` for the full plan, AI model cascade, and pricing math.
