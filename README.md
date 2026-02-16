# ViralReelsAI

A personal web and mobile dashboard to track and analyze viral Instagram Reels in specific niches. Powered by Apify scraping, Supabase, and a custom virality scoring algorithm.

## Architecture

```
viralreels/
├── apps/
│   ├── web/          Next.js 14 (App Router) dashboard
│   └── mobile/       React Native + Expo mobile app
├── packages/
│   ├── shared/       Shared TypeScript types, constants, virality algorithm
│   └── supabase/     Supabase client factories and typed query functions
├── supabase/
│   └── migrations/   PostgreSQL migration files
├── turbo.json        Turborepo config
└── vercel.json       Vercel cron job config
```

## Tech Stack

- **Frontend (Web):** Next.js 14 (App Router), TailwindCSS, Shadcn/UI
- **Mobile:** React Native with Expo (Managed Workflow), NativeWind
- **Backend:** Next.js API Routes (Serverless)
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Scraping:** Apify API (`apify/instagram-hashtag-scraper`)
- **Auth:** Supabase Auth (email/password)
- **Language:** TypeScript (Strict mode)
- **Monorepo:** Turborepo with npm workspaces

## Features

1. **Scraper Engine** - A Vercel cron job triggers Apify every 6 hours to scrape reels by hashtag.
2. **Virality Score** - `(Likes + Comments) / Views` - measures engagement relative to reach.
3. **Rising Star Detection** - Flags videos posted < 48h ago with > 100K views.
4. **Dashboard** - Grid of reels sorted by viral score with filters (Last 24h, Rising Stars, Audio Trending).
5. **Video Playback** - Click-to-play video modal with full engagement stats.
6. **Niche Management** - Add/remove/toggle hashtag niches from Settings.

## Prerequisites

- Node.js 18+
- npm 10+
- A [Supabase](https://supabase.com) project
- An [Apify](https://apify.com) account with API token
- (Optional) [Vercel](https://vercel.com) account for deployment

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url> viralreels
cd viralreels
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in your Supabase URL, keys, Apify token, and cron secret.

### 3. Set up the database

Run the SQL migration against your Supabase project:

- Go to your Supabase Dashboard > SQL Editor
- Paste the contents of `supabase/migrations/00001_initial_schema.sql`
- Execute

### 4. Create a user

Either sign up via the login page or create a user in Supabase Dashboard > Authentication.

### 5. Run the web app

```bash
npm run dev --filter=@viralreels/web
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Run the mobile app

```bash
cd apps/mobile
cp .env.example .env
# Fill in EXPO_PUBLIC_* variables
npx expo start
```

## Vercel Deployment

1. Push to GitHub.
2. Import the project in Vercel. Set the root directory to `apps/web`.
3. Add all environment variables from `.env.example`.
4. Add `CRON_SECRET` (16+ chars) - Vercel will automatically send this with cron requests.
5. Deploy. The cron job at `/api/cron/scrape` will run every 6 hours.

## Virality Score Formula

```
ViralScore = (Likes + Comments) / Views
```

Score tiers:
- **HOT** (>= 10%) - Extremely viral engagement
- **WARM** (>= 5%) - Strong engagement
- **MILD** (>= 2%) - Average engagement
- **COLD** (< 2%) - Below average

## Database Schema

**reels** - Scraped Instagram reels with engagement metrics and viral scores.

**niches** - Hashtag niches to track (e.g., "aiart", "coding", "fitness").

**reel_niches** - Many-to-many junction table linking reels to niches.

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reels` | List reels (paginated, filterable) |
| GET | `/api/reels/[id]` | Get single reel |
| GET | `/api/niches` | List all niches |
| POST | `/api/niches` | Create niche |
| PATCH | `/api/niches/[id]` | Toggle niche active status |
| DELETE | `/api/niches/[id]` | Delete niche |
| GET | `/api/cron/scrape` | Trigger scrape (Vercel cron) |

## License

Private project. Not for redistribution.
