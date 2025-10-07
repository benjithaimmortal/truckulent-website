# Pittsburgh Food Trucks Frontend

A Jekyll-based static site generator that displays Pittsburgh food truck events with interactive Google Maps integration.

## Features

- 🗺️ **Interactive Google Maps** with event markers and clustering
- 🔍 **Advanced Filtering** by date, truck name, and location
- 📱 **Mobile-First Design** with responsive layout
- 🚚 **Individual Truck Pages** with event history
- 📅 **Event Details** with directions and venue information
- 🔄 **Automated Data Updates** every 6 hours via GitHub Actions
- 📍 **Geocoding Integration** for accurate location data

## Quick Start

### Option 1: Docker Development (Recommended)

1. **Setup environment:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

2. **Start development server:**
   ```bash
   docker-compose up
   ```

3. **Access the site:**
   - Open http://localhost:4000 in your browser

### Option 2: Local Development

1. **Setup environment:**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

2. **Install dependencies:**
   ```bash
   bundle install
   ```

3. **Start development server:**
   ```bash
   bundle exec jekyll serve --livereload
   ```

### Environment Configuration

Edit `.env` with your credentials:

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

## Project Structure

```
/
├── _config.yml              # Jekyll configuration
├── _data/                   # Data files (auto-generated)
│   ├── events.json         # Events from Supabase
│   ├── trucks.json         # Truck information
│   └── geocoded_locations.json # Cached geocoding
├── _layouts/               # Page layouts
│   ├── default.html       # Base layout
│   ├── event.html         # Event page layout
│   └── truck.html         # Truck page layout
├── _plugins/              # Jekyll plugins
│   ├── data_fetcher.rb    # Supabase data fetching
│   └── fetch_data.rb     # Standalone data fetcher
├── _sass/                 # SCSS stylesheets
├── assets/                # Static assets
│   ├── css/main.scss     # Main stylesheet
│   └── js/               # JavaScript files
├── .github/workflows/     # GitHub Actions
└── index.html            # Homepage
```

## Data Sources

### Supabase Integration

The site pulls data from a `public_events` view that includes:

- Event details (date, time, venue)
- Truck information
- Location data (address, coordinates)
- Confidence scores
- Source URLs

### Google Maps Integration

- **Geocoding API**: Converts addresses to precise coordinates
- **Maps JavaScript API**: Interactive map display
- **Caching**: Geocoded results are cached to minimize API calls

## Deployment

### GitHub Pages

1. Enable GitHub Pages in repository settings
2. Set source to "GitHub Actions"
3. The workflow will automatically build and deploy

### Netlify

1. Connect your repository to Netlify
2. Set build command: `bundle exec jekyll build`
3. Set publish directory: `_site`
4. Add environment variables in Netlify dashboard

## Development

### Docker Commands

```bash
# Start development server
docker-compose up

# Build production site
docker-compose run --rm jekyll bundle exec jekyll build

# Fetch data from Supabase
docker-compose run --rm jekyll bundle exec ruby _plugins/fetch_data.rb
```

### Local Development (without Docker)

```bash
# Install dependencies
bundle install

# Start development server
bundle exec jekyll serve --livereload

# Build for production
bundle exec jekyll build

# Fetch data from Supabase
bundle exec ruby _plugins/fetch_data.rb
```

### Customization

#### Styling

Edit SCSS files in `_sass/`:
- `_base.scss` - Base styles and typography
- `_layout.scss` - Layout components
- `_components.scss` - UI components

#### JavaScript

Modify files in `assets/js/`:
- `main.js` - Main application logic
- `map.js` - Google Maps functionality
- `filters.js` - Filter and search logic

## API Requirements

### Supabase

- **URL**: Your Supabase project URL
- **Key**: Anonymous/public key
- **Table**: `public_events` view with proper RLS policies

### Google Maps

- **Maps JavaScript API**: For interactive maps
- **Geocoding API**: For address geocoding
- **Billing**: Required for production use

## Performance

### Optimization Features

- **Static Generation**: Pre-built pages for fast loading
- **Image Optimization**: Automatic image processing
- **Caching**: Geocoded locations cached locally
- **CDN Ready**: Optimized for CDN deployment

### Monitoring

- **Build Times**: Tracked in GitHub Actions
- **API Usage**: Monitor Google Maps API quotas
- **Data Freshness**: Events updated every 6 hours

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check API keys in environment variables
   - Verify Supabase connection
   - Review GitHub Actions logs

2. **Missing Data**
   - Run data fetcher manually: `bundle exec ruby _plugins/fetch_data.rb`
   - Check Supabase RLS policies
   - Verify API quotas

3. **Map Not Loading**
   - Verify Google Maps API key
   - Check browser console for errors
   - Ensure API is enabled in Google Cloud Console

### Debug Mode

```bash
# Enable debug logging
JEKYLL_ENV=development bundle exec jekyll serve --verbose
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
