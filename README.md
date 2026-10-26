# SHOPZY

**Local business discovery & price comparison platform.**
Find shops near you, compare what they actually charge for the same item, and call or navigate in one tap.

Built as a production-shaped MERN application: TypeScript end to end, geospatial search on MongoDB,
JWT auth with refresh-token rotation, RBAC, Redis-backed caching and rate limiting, containerised and CI-gated.

---

## Table of contents

- [Quick start](#quick-start)
- [What's implemented](#whats-implemented)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project layout](#project-layout)
- [Configuration](#configuration)
- [API reference](#api-reference)
- [Data model](#data-model)
- [Search engine](#search-engine)
- [Security](#security)
- [Performance](#performance)
- [Testing](#testing)
- [Deployment](#deployment)
- [Scaling path](#scaling-path)
- [Project report material](#project-report-material)

---

## Quick start

**Requirements:** Node.js 20+ (tested on 22). Nothing else — no local MongoDB or Docker needed.

```bash
npm install
npm run dev
```

That starts:

| Service | URL |
| --- | --- |
| Web app | http://localhost:5173 |
| API | http://localhost:4000/api/v1 |
| Health check | http://localhost:4000/api/v1/health |

**How it works with no database installed:** when `MONGODB_URI` is unset outside production, the API boots an
in-memory MongoDB ([`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server)) and — finding it
empty — loads the Bhopal demo dataset automatically. The first run downloads a ~600 MB MongoDB binary and takes a
couple of minutes; every run after that starts in seconds.

Because that database lives in memory, **data resets on every restart.** For persistence, point `MONGODB_URI` at a
real MongoDB (Atlas free tier works) and run `npm run seed` once.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Super admin | `admin@shopzy.in` | `Admin@1234` |
| Shop owner | `owner1@shopzy.in` | `Password@123` |
| Customer | `aditya.sharma@example.com` | `Password@123` |

### Useful commands

```bash
npm run dev            # API + web together
npm run dev:server     # API only
npm run dev:web        # web only
npm run seed           # reload the demo dataset (needs a persistent MONGODB_URI)
npm test               # 150 automated API + unit tests across 7 test suites
npm run lint           # ESLint across both workspaces (0 errors)
npm run typecheck      # strict TypeScript across both workspaces (0 errors)
npm run audit          # dependency audit with assessed exceptions
npm run build          # production builds
```

### With Docker

```bash
docker compose up --build       # web :8080, API :4000, Mongo replica set, Redis
docker compose run --rm seed    # load the demo data
```

---

## What's implemented

**Discovery**
- Geospatial search with radius filter, powered by a `2dsphere` index and `$geoNear`
- Composite relevance scoring: name match, tags, rating, popularity, verified/featured boosts, distance decay
- Filters: category, rating, price ceiling, open-now, has-offers, delivery, booking, parking, UPI, verified-only
- Sorting: relevance, distance, rating, price (both ways), popularity, recency
- Faceted counts for categories, ratings and price bands, computed in the same round trip
- Autocomplete across shop names, tags and price-list item names
- Trending searches derived from the analytics event stream

**Price comparison** — the headline feature. Unwinds matching price items across every nearby shop and ranks them
cheapest first, with min/avg/max stats and per-shop savings.

**Accounts & auth**
- Register / login by email *or* phone, bcrypt (cost 12), JWT access + refresh tokens
- Refresh-token **rotation with replay detection** — a consumed token is blacklisted immediately
- 6-digit OTP phone verification (HMAC-stored, 5-minute TTL, 3-attempt cap)
- Password reset, password change, RBAC across four roles
- DPDP Act compliance: data export and account erasure

**Shops**
- Full CRUD scoped to the owner, admin override, soft delete
- Nested price lists with variants, compare-at prices and availability
- Offers with percentage / fixed / BOGO discount types and validity windows
- Timezone-aware, break-aware, holiday-aware opening hours
- Image upload with MIME + extension validation and server-generated filenames
- Per-shop analytics: views, call clicks, direction requests, conversion rate, 30-day trend

**Reviews** — one per user per shop (enforced by a unique index), owner replies, helpful votes, photo support,
rating aggregates denormalised onto the shop with full recalculation on every change.

**Admin panel** — verification queue with approve/reject and mandatory rejection reasons, featured-shop toggles,
user suspension, review moderation, platform analytics including zero-result search queries.

**Frontend** — 11 routes, responsive from 360 px up, route-level code splitting, skeleton loaders, optimistic
toasts, keyboard-navigable autocomplete, accessible focus management, and Schema.org `LocalBusiness` +
`AggregateRating` JSON-LD on every shop page.

---

## Architecture

### Deployed topology

```
                        ┌──────────────┐
                        │   Browser    │
                        └──────┬───────┘
                               │ HTTPS
                        ┌──────▼───────┐
                        │  CDN + WAF   │   Cloudflare / CloudFront
                        └──────┬───────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
          ┌──────▼───────┐          ┌────────▼────────┐
          │ nginx (SPA)  │          │  API Gateway    │  TLS, rate limit
          │ static bundle│          │  / Load balancer│
          └──────────────┘          └────────┬────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │   Node.js API (N replicas)  │
                              │   Express + TypeScript      │
                              │                             │
                              │  routes → validators →      │
                              │  controllers → services →   │
                              │  models                     │
                              └──────┬───────────────┬──────┘
                                     │               │
                      ┌──────────────▼───┐     ┌─────▼──────┐
                      │ MongoDB          │     │  Redis     │
                      │ replica set      │     │  cache +   │
                      │ 2dsphere + text  │     │  limiter   │
                      └──────────────────┘     └────────────┘
```

### Request pipeline

Every request passes through the same ordered chain:

```
helmet → cors → body parsers → hpp → mongoSanitize → requestContext
      → rateLimit → route → validate(zod) → auth → rbac
      → controller → service → model → MongoDB
      → serializer → response envelope
                                    ↘ errorHandler (normalises everything)
```

**Layer responsibilities**

| Layer | Owns | Never does |
| --- | --- | --- |
| Routes | URL shape, middleware order | Business logic |
| Validators | Zod schemas; coerce and whitelist input | Database access |
| Controllers | HTTP concerns, status codes | Query building |
| Services | Business rules, transactions, cache invalidation | Touch `req`/`res` |
| Serializers | Shaping responses per audience (public / owner / admin) | Fetch data |
| Models | Schema, indexes, hooks | Cross-entity orchestration |

The rule that keeps this honest: **services never import Express types.** They are callable from an HTTP handler, a
cron job, or a queue worker without modification.

### Response envelope

Every endpoint returns the same shape, so the client has exactly one parsing path:

```jsonc
// success
{ "success": true, "data": [...], "meta": { "page": 1, "total": 42, "facets": {...} } }

// failure
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

---

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | React 18 + Vite + TypeScript | Fast HMR, strict typing, tiny production bundles |
| Server state | TanStack Query | Caching, background refetch, `keepPreviousData` for flicker-free paging |
| Client state | Zustand | Auth/location/toasts without Redux boilerplate |
| Styling | Tailwind CSS v4 | Utility-first with a design-token theme; no runtime CSS-in-JS cost |
| Backend | Node.js + Express + TypeScript | Async I/O suits an I/O-bound search API |
| Validation | Zod | One schema validates *and* infers the TypeScript type |
| Database | MongoDB + Mongoose | Geospatial queries and flexible per-category price lists |
| Cache | Redis (in-process fallback) | Shared cache and rate-limit counters across replicas |
| Auth | JWT access + rotating refresh | Stateless verification; revocation via a Redis blacklist |
| Logging | Winston | JSON in production for ELK/CloudWatch, readable in dev |
| Testing | Jest + Supertest + mongodb-memory-server | Real HTTP against a real database, no mocks |

### Why MongoDB rather than PostgreSQL

Three properties of this domain drove the decision:

1. **Price lists are heterogeneous.** A salon lists services with durations; a kirana lists SKUs by weight; a gym
   lists membership tiers. In SQL that's an EAV table or a JSONB column — both give up the ergonomics.
2. **Geospatial queries are first-class.** `$geoNear` filters *while walking* the `2dsphere` index and returns
   distance in the same pass, so filtering, distance calculation, scoring and faceting happen in a single
   aggregation.
3. **Reads dominate writes ~50:1.** Denormalising rating aggregates and price ranges onto the shop document turns
   the hot path into a single-collection query — no joins on the read path at all.

The trade-off is real: no foreign keys, no cross-document transactions by default. We compensate with a unique
compound index on `(shopId, userId)` for reviews, and by recomputing aggregates from source rather than
incrementing counters (see `recalculateRatings`).

---

## Project layout

```
shopzy/
├── server/
│   ├── src/
│   │   ├── config/         env (Zod-validated), db, logger
│   │   ├── models/         User, Shop, Review, Category, AnalyticsEvent
│   │   ├── middleware/     auth, rbac, validate, sanitize, rateLimit, upload, error
│   │   ├── validators/     Zod schemas per resource
│   │   ├── services/       auth, shop, search, review, serializers
│   │   ├── controllers/    HTTP handlers
│   │   ├── routes/         versioned route tables
│   │   ├── utils/          cache, token, otp, geo, hours, slug, ApiError
│   │   ├── seed/           Bhopal dataset + loader
│   │   ├── app.ts          Express assembly
│   │   └── index.ts        bootstrap + graceful shutdown
│   ├── tests/              89 tests
│   └── Dockerfile
├── web/
│   ├── src/
│   │   ├── components/     Layout, SearchBar, ShopCard, CategoryIcon, ui primitives
│   │   ├── pages/          Home, Search, ShopDetail, Compare, Auth, Owner, Admin, Misc
│   │   ├── lib/            api client, queries, hooks, formatters
│   │   ├── store.ts        auth / location / toast stores
│   │   └── App.tsx         router + guards
│   ├── nginx.conf
│   └── Dockerfile
├── docs/                   ER, DFD, use-case, deployment diagrams
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Configuration

Copy `server/.env.example` to `server/.env`. Every variable is validated by Zod at boot — the process exits with a
readable error rather than failing at the first request.

| Variable | Default | Notes |
| --- | --- | --- |
| `MONGODB_URI` | *(empty)* | Empty → in-memory MongoDB in dev; **required** in production |
| `REDIS_URL` | *(empty)* | Empty → in-process LRU cache |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | dev placeholders | Boot **fails** in production if left at defaults |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | |
| `BCRYPT_ROUNDS` | `12` | |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated CORS allow-list |
| `RATE_LIMIT_GENERAL` / `_AUTH` / `_SEARCH` | `100` / `5` / `10` | Requests per minute |
| `MAX_UPLOAD_MB` | `5` | |

---

## API reference

Base path `/api/v1`. 🔒 = auth required, 👑 = admin only.

### Auth
```
POST   /auth/register            Create account (customer or owner)
POST   /auth/login               Sign in by email or phone
POST   /auth/refresh             Rotate tokens
POST   /auth/logout              Revoke the refresh token
POST   /auth/otp/request         Send a phone OTP
POST   /auth/verify-phone        Confirm the OTP
POST   /auth/forgot-password     Begin reset
POST   /auth/reset-password      Complete reset
POST   /auth/change-password  🔒 Change while signed in
GET    /auth/me               🔒 Current profile
PUT    /auth/me               🔒 Update profile
PUT    /auth/me/location      🔒 Save location
```

### Discovery
```
GET    /shops                    Search (see parameters below)
GET    /shops/suggest            Autocomplete
GET    /shops/trending           Trending searches
GET    /shops/compare            Price comparison
GET    /shops/nearby             Nearest shops
GET    /shops/:slug              Shop detail
GET    /shops/:slug/similar      Similar shops nearby
GET    /categories               All categories
GET    /categories/:slug/shops   Shops in a category
```

**Search parameters**

| Parameter | Type | Notes |
| --- | --- | --- |
| `q` | string | Matches name, description, tags, category, item names |
| `lat`, `lng` | float | Must be supplied together |
| `radius` | 0.5–50 | Kilometres, default 5 |
| `category`, `subCategory`, `city` | string | |
| `minRating` | 0–5 | |
| `minPrice`, `maxPrice` | number | Overlap match against the shop's price range |
| `openNow`, `hasDelivery`, `hasBooking`, `hasParking`, `acceptsUPI`, `verifiedOnly` | boolean | |
| `sort` | enum | `relevance`, `distance`, `rating`, `price_low`, `price_high`, `popularity`, `newest` |
| `page`, `limit` | int | `limit` capped at 50 |

```bash
curl "http://localhost:4000/api/v1/shops?q=haircut&lat=23.2599&lng=77.4126&radius=10&sort=distance"
curl "http://localhost:4000/api/v1/shops/compare?item=Haircut&lat=23.2599&lng=77.4126&radius=20"
```

### Shops, reviews, account, admin
```
POST   /shops                 🔒 Create (owner)
PUT    /shops/:id             🔒 Update (owner or admin)
DELETE /shops/:id             🔒 Soft delete
GET    /shops/mine            🔒 My shops
GET    /shops/:id/analytics   🔒 Owner analytics
POST   /shops/:id/images      🔒 Upload images
POST   /shops/:id/track          Record an interaction

GET    /shops/:id/reviews        List reviews
POST   /shops/:id/reviews     🔒 Write a review
PUT    /reviews/:id           🔒 Edit own review
DELETE /reviews/:id           🔒 Delete own review
POST   /reviews/:id/helpful   🔒 Toggle helpful
POST   /reviews/:id/reply     🔒 Owner reply

GET    /me/saved-shops        🔒 Saved shops
POST   /me/saved-shops/:id    🔒 Toggle saved
GET    /me/export             🔒 Export my data (DPDP)
DELETE /me/account            🔒 Erase my account (DPDP)

GET    /admin/dashboard       👑 Platform stats
GET    /admin/shops           👑 Verification queue
PUT    /admin/shops/:id/verify 👑 Approve / reject
PUT    /admin/users/:id/status 👑 Suspend / reactivate
GET    /admin/analytics       👑 Search & city analytics
```

---

## Data model

```
┌──────────────────┐        owns          ┌──────────────────┐
│      User        │ 1 ─────────────── ∞  │      Shop        │
├──────────────────┤                      ├──────────────────┤
│ _id              │                      │ _id              │
│ email      (uniq)│                      │ ownerId     (FK) │
│ phone      (uniq)│                      │ slug       (uniq)│
│ passwordHash     │                      │ basicInfo{}      │
│ role             │                      │ contact{}        │
│ profile{}        │                      │ location  (GeoJSON)
│ location (2dsph) │                      │ media{}          │
│ preferences{}    │                      │ businessHours{}  │
│ savedShops[]  ───┼──── saves ─────────► │ pricing.items[]  │
│ searchHistory[]  │                      │ offers[]         │
└────────┬─────────┘                      │ features{}       │
         │                                │ ratings{}   ◄────┼── derived
         │ writes                         │ analytics{}      │
         │                                │ verification{}   │
         │                                │ priceRange{}◄────┼── derived
         │                                └────────┬─────────┘
         │                                         │
         │        ┌──────────────────┐             │
         └──────► │     Review       │ ◄───────────┘
                  ├──────────────────┤
                  │ shopId      (FK) │
                  │ userId      (FK) │   UNIQUE (shopId, userId)
                  │ rating   (1–5)   │
                  │ comment          │
                  │ helpful{}        │
                  │ reply{}          │
                  └──────────────────┘

┌──────────────────┐                      ┌──────────────────┐
│    Category      │ ◄── categorises ──── │ AnalyticsEvent   │
├──────────────────┤                      ├──────────────────┤
│ slug       (uniq)│                      │ eventType        │
│ subCategories[]  │                      │ shopId / userId  │
│ stats{}          │                      │ query, filters   │
└──────────────────┘                      │ createdAt (TTL)  │
                                          └──────────────────┘
```

### Indexes

| Collection | Index | Serves |
| --- | --- | --- |
| `shops` | `location` **2dsphere** | `$geoNear`, radius filtering |
| `shops` | text on name/description/tags/item names (weighted) | Keyword relevance |
| `shops` | `{city, category, verification.status, isActive}` | The default browse query |
| `shops` | `{ratings.average, ratings.total}` | Rating sort |
| `shops` | `{isFeatured, ratings.average}` | Homepage rail |
| `reviews` | `{shopId, userId}` **unique** | One review per user per shop |
| `reviews` | `{shopId, createdAt}` | Paginated review list |
| `users` | `email`, `phone` unique; `location` 2dsphere sparse | Login, nearby users |
| `analyticsEvents` | `{createdAt}` **TTL 180d** | Automatic retention |

**Two fields are deliberately denormalised.** `ratings.{average,total,breakdown}` and `priceRange.{min,max}` are
copies of data derivable from elsewhere. Keeping them on the shop document means sorting by rating or filtering by
price is a single indexed field lookup instead of a `$lookup` or `$unwind` on every search. Both are recomputed
from source whenever the underlying data changes, so they cannot drift.

---

## Search engine

One aggregation pipeline does the whole job:

```js
[
  { $geoNear: {                        // must be first; filters via the 2dsphere index
      near: { type: 'Point', coordinates: [lng, lat] },
      distanceField: 'distanceMeters',
      maxDistance: radius * 1000,
      query: { isActive: true, ...filters },   // applied during the index walk
      spherical: true } },
  { $addFields: { distanceKm: { $divide: ['$distanceMeters', 1000] } } },
  { $addFields: { /* relevance signals */ } },
  { $addFields: { score: /* composite */ } },
  { $facet: {                          // page + facet counts in one round trip
      items:      [ { $sort }, { $skip }, { $limit }, { $project } ],
      total:      [ { $count: 'value' } ],
      categories: [ { $group }, { $sort }, { $limit: 12 } ],
      ratings:    [ { $bucket: { boundaries: [0,1,2,3,4,5.01] } } ],
      prices:     [ { $bucket: { boundaries: [0,100,500,1000,5000,MAX] } } ] } }
]
```

### Relevance formula

```
score = (1
         + 3.0 · nameMatch
         + 1.5 · tagMatch
         + 0.4 · rating
         + 0.15 · ln(1 + views))
      × (isFeatured ? 1.3 : 1)
      × (isVerified ? 1.2 : 1)
      × 1 / (1 + distanceKm / 5)
```

The distance decay is deliberately gentle: a shop 5 km away scores half a shop next door, but a strong name match
still beats a weak nearby result. That matches how people actually search — *"I want a good barber"* more often
than *"I want the closest barber."*

### Two constraints worth knowing

**MongoDB forbids `$text` inside `$geoNear`.** Both must be the first pipeline stage, so they cannot be combined.
Geo-aware keyword search therefore uses a multi-field regex (escaped against ReDoS) rather than the text index. The
text index still exists and serves non-geo queries. At scale this whole stage moves to Elasticsearch, which handles
geo *and* full-text scoring in one query — that's the migration described in [Scaling path](#scaling-path).

**`openNow` cannot be a query predicate.** Whether a shop is open depends on its own IANA timezone, its break
windows and any holiday overrides — none of which MongoDB can evaluate. It is applied in `getOpenState()` after
candidates return. The trade-off is that `openNow` filters the current page rather than the total, so the result
count is an upper bound when it's active.

### Caching

| Key pattern | TTL | Invalidated by |
| --- | --- | --- |
| `shop:{slug}` | 1 h | Any write to that shop |
| `shops:search:{hash}` | 5 min | Any shop write (prefix flush) |
| `shops:nearby:{lat}:{lng}:{r}:{hash}` | 2 min | Any shop write |
| `categories:all` | 1 h | Category or shop write |
| `otp:{purpose}:{phone}` | 5 min | Successful verification |
| `refresh:blacklist:{jti}` | 7 d | Expiry |

Coordinates are rounded to three decimals (~110 m) before hashing, so users standing near each other share cache
entries instead of each minting their own.

---

## Security

Mapped against the OWASP Top 10:

| Risk | Mitigation | Where |
| --- | --- | --- |
| **A01 Broken access control** | RBAC middleware; every mutation re-checks ownership server-side via `assertCanManage`; admins cannot modify other admins | `middleware/auth.ts`, `services/shop.service.ts` |
| **A02 Cryptographic failures** | bcrypt cost 12; `passwordHash` has `select: false`; OTPs stored as HMAC only; `httpOnly` + `secure` + `sameSite` cookies | `models/User.ts`, `utils/otp.ts` |
| **A03 Injection** | Zod parses and **replaces** every request segment; `mongoSanitize` strips `$`-prefixed and prototype keys; regex input escaped and length-capped | `middleware/validate.ts`, `middleware/sanitize.ts` |
| **A04 Insecure design** | Refresh-token rotation with replay detection; OTP attempt caps; owners cannot review their own shops | `services/auth.service.ts` |
| **A05 Misconfiguration** | Helmet CSP + HSTS; `x-powered-by` off; stack traces never serialised in production; boot fails on default secrets | `app.ts`, `config/env.ts` |
| **A06 Vulnerable components** | `npm audit --audit-level=high` and Trivy image scanning in CI | `.github/workflows/ci.yml` |
| **A07 Auth failures** | Identical responses for unknown-user and wrong-password; per-identity auth rate limiting; suspended accounts rejected on every request | `services/auth.service.ts` |
| **A08 Integrity failures** | Upload MIME **and** extension allow-list; server-generated filenames; 5 MB cap; `nosniff` on static responses | `middleware/upload.ts` |
| **A09 Logging failures** | Correlation ID per request; structured JSON logs; auth events and admin actions logged with actor | `middleware/requestContext.ts` |
| **A10 SSRF** | No user-supplied URL is ever fetched server-side | — |

### Dependency advisories

`npm run audit` fails on any advisory at or above **high** unless it has been assessed and allowlisted in
`scripts/audit.mjs` with a written justification and a review date. There is currently one such exception.

React Router carries two advisory clusters, and they land on different versions:

| Version range | Advisory | Reachable here? |
| --- | --- | --- |
| 6.0.0 – 7.17.0 | Open redirect via backslash in `<Link>` / `useNavigate` | **Yes** — that is exactly how this app routes |
| 7.12.0 – 8.2.0 | CSRF bypass in **RSC mode** | **No** — pure client SPA: no RSC, no SSR, no data router |

So the versions npm reports as "fixed" are the ones carrying the flaw that actually applies here.
`npm audit fix --force` would downgrade to 7.11.0 and land squarely in the reachable open-redirect range.
We stay on **7.18.2**, accept the unreachable RSC advisory, and re-check it on the date in the allowlist.

Three decisions worth calling out:

**Login responses are indistinguishable.** Wrong password and non-existent account return byte-identical bodies.
Without this, an attacker enumerates valid accounts before attempting credential stuffing. Verified by test.

**Refresh tokens are single-use.** Each carries a `jti`; redeeming it blacklists that `jti` for the token's
remaining lifetime. If a stolen token is replayed after the legitimate client has rotated, it fails. Verified by
test.

**Profile updates map fields explicitly.** `updateMe` builds its `$set` field by field rather than spreading
`req.body`. A request containing `{"role": "super_admin"}` updates the name and silently discards the rest.
Verified by test.

---

## Performance

| Concern | Approach |
| --- | --- |
| Search latency | Single-pass `$geoNear` + `$facet`; filters pushed into the index walk |
| N+1 queries | Ratings and price ranges denormalised; zero joins on the read path |
| Payload size | Audience-specific serializers — search results omit hours, documents and raw analytics |
| Cold cache | Read-through helper; hot paths keyed by rounded coordinates |
| Bundle size | Route-level code splitting; vendor chunks; explicit icon registry instead of a namespace import |
| Analytics writes | Fire-and-forget, wrapped in try/catch — never in the response path |
| Connection churn | Mongoose pool (5–50); `keepAliveTimeout` tuned above the typical ALB idle timeout |

**Measured on the seeded dataset:** geo search with filters and facets returns in ~37 ms cold, ~1 ms cached.

**Frontend bundle** (gzipped): 25 kB app + 52 kB React + 15 kB Query + 9 kB CSS ≈ **101 kB initial load**. Route
chunks are 2.5–7 kB each.

An earlier version shipped an 855 kB main chunk because `import * as Icons from 'lucide-react'` defeats
tree-shaking — the namespace import pulls in every icon. Replacing it with an explicit registry of the 27 icons
actually used cut the chunk to 87 kB.

---

## Testing

```bash
npm test                          # 89 tests
npm run test:coverage --workspace=server
```

```
Test Suites: 4 passed, 4 total
Tests:      89 passed, 89 total
Statements: 72.87%   Lines: 78.03%
```

Every API test runs real HTTP through Supertest against a real MongoDB instance
(`mongodb-memory-server`) — no mocked models, so index behaviour, validation hooks and aggregation pipelines are
genuinely exercised.

| File | Covers |
| --- | --- |
| `auth.test.ts` | Registration, login, token rotation & replay, OTP, privilege-escalation attempts, enumeration resistance |
| `shops.test.ts` | Geo filtering, distance sort, item-name matching, facets, ownership enforcement, soft delete |
| `reviews-admin.test.ts` | Rating recalculation, one-review-per-user, owner replies, verification workflow, DPDP rights |
| `utils.test.ts` | Opening-hours logic (midnight crossing, breaks, holidays, timezones), Haversine, slugs |

**Not covered:** frontend component tests, Cypress E2E and k6 load tests are specified in the architecture but not
implemented here. The API surface they would exercise is covered by the integration tests above.

---

## Deployment

### Containers

Both images are multi-stage. The API image builds TypeScript in one stage, installs production-only dependencies in
another, and copies just `dist/` and `node_modules` into a `node:22-alpine` runtime that runs as the non-root
`node` user under `dumb-init` (so `SIGTERM` reaches Node and graceful shutdown actually happens). The web image
builds the bundle and serves it from nginx with immutable caching on content-hashed assets and an SPA fallback.

```bash
docker compose up --build
docker compose run --rm seed
```

### Kubernetes notes

- `GET /api/v1/health` → liveness; `GET /api/v1/ready` → readiness (returns 503 until Mongo connects)
- `SIGTERM` drains in-flight requests, then closes Mongo and Redis, with a 15 s force-exit backstop
- The API is stateless — scale horizontally; set `REDIS_URL` so cache and rate-limit counters are shared
- Uploads must move to S3/Cloudinary before scaling past one replica (the local disk driver is dev-only)

### Production checklist

- [ ] `MONGODB_URI` points at a replica set; `REDIS_URL` set
- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` rotated to 32+ random bytes
- [ ] `CLIENT_ORIGIN` restricted to real origins
- [ ] `STORAGE_DRIVER=cloudinary` (or S3) configured
- [ ] TLS terminated upstream; HSTS confirmed
- [ ] Backups enabled; Sentry/APM wired up

---

## Scaling path

The current design is honest about where it breaks and what replaces it:

| Bottleneck | Appears at | Fix |
| --- | --- | --- |
| Regex keyword search | ~100 k shops/city | Elasticsearch — combines geo *and* full-text scoring, adds fuzzy matching and typo tolerance |
| `openNow` post-filtering | Any large result set | Precompute open/closed into a materialised field on a 15-minute cron |
| Analytics in MongoDB | ~10 M events | Stream to ClickHouse; keep only aggregates in Mongo |
| Local disk uploads | Second replica | Cloudinary/S3 with presigned direct uploads |
| Single API service | ~10 k concurrent users | Split auth / shop / search into separate services behind the gateway |
| Synchronous side effects | High write volume | Move image processing and notifications to a Bull/RabbitMQ queue |

The layering is what makes each of these a contained change. Swapping the search backend means rewriting
`services/search.service.ts` — routes, validators, controllers and every client stay untouched, because they only
ever depended on the `SearchResult` shape.

---

## Project report material

Everything a college submission needs is in [`docs/`](./docs):

| Document | Contents |
| --- | --- |
| [`docs/diagrams.md`](./docs/diagrams.md) | System architecture (3-tier), ER diagram, DFD levels 0 & 1, use-case diagram, deployment diagram, sequence diagrams |
| [`docs/viva.md`](./docs/viva.md) | Likely examiner questions with worked answers, and the design trade-offs behind each decision |

**Talking points that hold up under questioning:**

1. **Why `2dsphere` and not `lat`/`lng` columns?** A B-tree on two floats can't answer "within 5 km" without
   scanning a bounding box and post-filtering. `2dsphere` builds an S2 geometry index; `$geoNear` walks it in
   distance order and stops at `maxDistance` — the sort comes free.
2. **Why JWT over sessions?** Session lookup requires shared state on every request; JWTs verify from a signature.
   The cost is revocation, which we buy back with short access TTLs (15 min) and a refresh blacklist.
3. **Why denormalise ratings?** A `$lookup` on reviews for every search result is O(results) extra work per query.
   One number on the shop document makes it O(1) and indexable — at the price of recalculation on every review
   change, which is the rarer operation by two orders of magnitude.
4. **Where does this break?** Named explicitly in [Scaling path](#scaling-path) above — knowing the limits is the
   point of the exercise.

---

## Licence

MIT — built as a major project, structured to survive contact with real users.
