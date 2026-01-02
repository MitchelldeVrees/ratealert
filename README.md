# RateAlert on Vercel

Serverless API (Node) that pulls Dutch savings-account offers from Independer, ranks them by interest earned, and returns JSON. Deployable to Vercel.

## Endpoints

- `GET /api/ratealert` (also available on `/` via rewrite)
  - Query params:
    - `principal` (float, default `100000`): starting balance in euros.
    - `horizons` (comma-separated ints, default `90,180,365`): days to project.
    - `top_n` (int, default `10`): number of offers per horizon.

Example: `/api/ratealert?principal=75000&horizons=60,120&top_n=5`

## Local development

Requires Node 18+ (Vercel default). To simulate locally:

```bash
npm install        # nothing to install; creates lockfile if desired
vercel dev         # requires Vercel CLI
# then visit http://localhost:3000/api/ratealert
```

## Deploying to Vercel

```bash
vercel login           # if needed
vercel                 # first deploy, accepts defaults
```

`vercel.json` rewrites `/` to the ratealert API; runtime is auto-detected by Vercel's Node builder.
