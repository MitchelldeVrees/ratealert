# RateAlert on Vercel

Next.js + Tailwind landing page for RenteOverzicht plus serverless API that ranks savings-account offers by interest earned and returns JSON. Deployable to Vercel.

## Endpoints

- `GET /api/ratealert`
  - Query params:
    - `principal` (float, default `100000`): starting balance in euros.
    - `horizons` (comma-separated ints, default `90,180,365`): days to project.
    - `top_n` (int, default `10`): number of offers per horizon.

Example: `/api/ratealert?principal=75000&horizons=60,120&top_n=5`

## Local development

Requires Node 18+ (Vercel default). To simulate locally:

```bash
npm install
npm run dev        # http://localhost:3000
# API example: http://localhost:3000/api/ratealert?principal=75000&horizons=60,120&top_n=5
```

## Deploying to Vercel

```bash
vercel login           # if needed
vercel                 # first deploy, accepts defaults
```

Vercel auto-detects Next.js and the API routes under `app/api/*`.

## Email flow (Resend + double opt-in)

Set these environment variables:

- `RESEND_API_KEY`
- `RESEND_AUDIENCE_ID`
- `RESEND_FROM_EMAIL`
- `SIGNING_SECRET`
- `APP_BASE_URL` (e.g. https://renteoverzicht.com)
- `CRON_SECRET` (for weekly send endpoint)

Flow:

1) `POST /api/subscribe` with `{ email }` → sends confirmation email.
2) User clicks confirmation link → `/confirm?token=...` → adds to Resend audience.
3) External scheduler calls `POST /api/send-weekly` with header `Authorization: Bearer <CRON_SECRET>` to send weekly emails to all contacts.
