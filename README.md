# RateAlert on Vercel

Serverless API that pulls Dutch savings-account offers from Independer, ranks them by interest earned, and returns JSON. Deployable to Vercel with the Python runtime.

## Endpoints

- `GET /api/ratealert` (also available on `/` via routing)
  - Query params:
    - `principal` (float, default `100000`): starting balance in euros.
    - `horizons` (comma-separated ints, default `90,180,365`): days to project.
    - `top_n` (int, default `10`): number of offers per horizon.

Example: `/api/ratealert?principal=75000&horizons=60,120&top_n=5`

## Local development

```bash
pip install -r requirements.txt
python main.py             # optional CLI summary + exports offers_normalized.json
```

To simulate Vercel locally (requires the Vercel CLI):

```bash
vercel dev
# then visit http://localhost:3000/api/ratealert
```

## Deploying to Vercel

```bash
vercel login           # if needed
vercel                 # first deploy, accepts defaults
```

`vercel.json` rewrites `/` to the ratealert API; runtime is auto-detected by Vercel's Python builder.
