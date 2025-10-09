# Build Scripts

This directory contains the data fetching script for the Pittsburgh Food Trucks site.

## Scripts

### `fetch-data.rb`
Standalone Ruby script that fetches events data from Supabase. This script runs independently of Jekyll and caches data to `_data/` directory. No geocoding is performed as it's handled by the backend.

**Usage:**
```bash
# Using docker-compose (recommended)
npm run fetch-data

# Or directly with docker-compose
docker-compose run --rm jekyll ruby scripts/fetch-data.rb
```

**Environment Variables:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `JEKYLL_ENV` - Set to 'production' to force data refresh

## Data Flow

1. **Data Fetching**: `fetch-data.rb` fetches events from Supabase
2. **Caching**: Data is cached in `_data/` directory
3. **Jekyll Build**: Jekyll reads from cached data files
4. **Site Generation**: Static site is generated in `_site/` directory

## Caching Strategy

- Data is cached for 6 hours in development
- Data is always fetched fresh in production
- Lock files prevent concurrent data fetching
- No geocoding needed (handled by backend)

## Development Workflow

1. Run `npm run dev` to start development (uses `docker-compose up`)
2. Data will be fetched automatically when the container starts
3. Jekyll will watch for changes and rebuild
4. Use `npm run fetch-data` to manually refresh data

## Production Build

1. Run `npm run build` to build the site
2. Docker will fetch data fresh from Supabase
3. Jekyll builds the static site
4. Site is ready for deployment

## Requirements

- Docker Compose must be installed and running
- Environment variables must be set for API access
- The Docker image will be built automatically using `docker-compose build`
