# Pittsburgh Food Trucks Frontend

A Jekyll-based static site generator that displays food truck events from Supabase with Google Maps integration.

## Features

- **Saul Bass-inspired Design** - Bold, geometric styling with custom color scheme
- **Real-time Data** - Fetches events from Supabase API
- **Interactive Map** - Google Maps integration with custom pins
- **Filtering & Sorting** - Filter by date, truck, location with sorting options
- **Responsive Design** - Works on desktop and mobile devices

## Quick Start

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd truckulent-frontend
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

3. **Run with Docker**
   ```bash
   docker-compose up
   ```

4. **Access the site**
   - Open http://localhost:4000 in your browser

### Environment Variables

Create a `.env` file with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Maps APIs
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
GOOGLE_GEOCODING_API_KEY=your-google-geocoding-api-key

# Site Configuration
SITE_URL=https://your-domain.com
```

## Deployment

### GitHub Pages

The site automatically deploys to GitHub Pages when you push to the `main` branch. The workflow:

1. Builds the Docker image
2. Fetches data from Supabase
3. Generates the Jekyll site
4. Deploys to GitHub Pages

### Manual Deployment

```bash
# Build the site
docker run --rm --entrypoint="" \
  -e JEKYLL_ENV=production \
  -e SUPABASE_URL=$SUPABASE_URL \
  -e SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY \
  -e GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY \
  -v $(pwd):/srv/jekyll \
  -v $(pwd)/_site:/srv/jekyll/_site \
  truckulent \
  bundle exec jekyll build
```

## Architecture

- **Jekyll** - Static site generator
- **Supabase** - Backend data source
- **Google Maps API** - Geocoding and map display
- **Docker** - Containerized development and deployment
- **GitHub Actions** - Automated builds and deployment

## Customization

### Colors
The site uses a Saul Bass-inspired color scheme defined in `_sass/_base.scss`:

```scss
:root {
  --black: #252729;
  --grey: #D9D8D6;
  --white: #fff;
  --primary: #FF4438;
  --dark-grey: #363636;
  --secondary: #3981c4;
  --tertiary: #79d050ef;
}
```

### Data Sources
Events are fetched from Supabase via the `_plugins/data_fetcher.rb` plugin. The data is cached locally and only refreshed when needed.

## Troubleshooting

### Common Issues

1. **"Failed to load events"** - Check that your Supabase credentials are correct
2. **Map not loading** - Verify your Google Maps API key has the correct permissions
3. **Docker build fails** - Ensure you have Docker installed and running

### Debug Mode

Enable debug logging by setting `JEKYLL_ENV=development` in your environment variables.

## License

MIT License - see LICENSE file for details.