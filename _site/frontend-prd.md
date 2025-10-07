# Frontend PRD — Pittsburgh Food Truck Events Static Site

*Last updated: 2025-01-27*

## 1) Summary

A **Jekyll-based static site generator** that pulls Pittsburgh food truck events from Supabase, enriches location data with Google Maps Geocoding API, and generates a responsive static website with interactive filtering, sorting, and an embedded Google Map. The site will be optimized for mobile-first viewing and deployed via GitHub Pages or similar static hosting.

---

## 2) Scope & Non-Goals

**In scope**

* Pull food truck events from Supabase `public_events` view via REST API
* Geocode addresses/venues using Google Maps Geocoding API for accurate lat/lng
* Generate static Jekyll site with responsive design
* Interactive Google Map with event markers and info windows
* Filtering by truck name, date range, venue, and location radius
* Sorting by date, truck name, and distance from user location
* Mobile-first responsive design
* SEO-optimized static pages for each truck and event
* RSS feed for upcoming events

**Out of scope (v1)**

* Real-time updates (static generation only)
* User authentication or personalization
* Event creation/editing interface
* Social media integration
* Push notifications
* Advanced analytics beyond basic page views

---

## 3) Data Sources & Architecture

### 3.1 Data Flow

```
Supabase (public_events) → Jekyll Build Process → Static Site
     ↓                           ↓
Google Maps Geocoding      GitHub Pages/Netlify
```

### 3.2 Supabase Integration

**Source**: `public_events` view from backend PRD
```sql
SELECT 
  e.id,
  t.name as truck_name,
  e.start_ts,
  e.end_ts,
  e.venue,
  e.raw_address,
  e.city,
  e.lat,
  e.lng,
  e.source_url,
  e.confidence,
  e.last_seen_at
FROM events e
JOIN trucks t ON e.truck_id = t.id
WHERE t.active = true
  AND e.start_ts >= NOW() - INTERVAL '14 days'
  AND e.start_ts <= NOW() + INTERVAL '60 days'
ORDER BY e.start_ts ASC;
```

**API Endpoint**: `GET ${SUPABASE_URL}/rest/v1/public_events?select=*&order=start_ts.asc`

### 3.3 Google Maps Integration

**Geocoding API**: Enrich addresses with precise coordinates
- Input: `raw_address` + `venue` + `city`
- Output: `lat`, `lng`, `formatted_address`
- Caching: Store results in `_data/geocoded_locations.json`

**Maps JavaScript API**: Interactive map display
- Markers for each event location
- Info windows with event details
- Clustering for dense areas
- Custom truck icons

---

## 4) Site Structure & Pages

### 4.1 Main Pages

```
/ (home)
├── /events/ (all events)
├── /trucks/ (truck directory)
├── /trucks/[truck-name]/ (individual truck pages)
├── /events/[event-id]/ (individual event pages)
├── /about/ (about page)
├── /feed.xml (RSS feed)
└── /sitemap.xml (sitemap)
```

### 4.2 Jekyll Structure

```
/
├── _config.yml
├── _data/
│   ├── events.json (from Supabase)
│   ├── trucks.json (from Supabase)
│   └── geocoded_locations.json (cached geocoding)
├── _includes/
│   ├── map.html (Google Maps component)
│   ├── event-card.html (event display)
│   ├── filter-panel.html (filtering UI)
│   └── truck-card.html (truck display)
├── _layouts/
│   ├── default.html
│   ├── event.html
│   └── truck.html
├── _plugins/
│   └── data_fetcher.rb (Supabase integration)
├── _sass/
│   ├── _base.scss
│   ├── _components.scss
│   └── _layout.scss
├── assets/
│   ├── css/main.scss
│   ├── js/
│   │   ├── map.js
│   │   ├── filters.js
│   │   └── main.js
│   └── images/
├── events/
├── trucks/
└── index.html
```

---

## 5) Features & Functionality

### 5.1 Interactive Map

**Google Maps Features**
- Full-screen and embedded map views
- Event markers with custom truck icons
- Info windows with event details and links
- Marker clustering for performance
- Street view integration
- Directions integration

**Map Controls**
- Toggle between map/list views
- Zoom to fit all events
- Filter markers by date/truck
- Search by location

### 5.2 Filtering & Sorting

**Filters**
- Date range picker (next 7/14/30 days)
- Truck name search/select
- Venue/location search
- Distance from user location
- Event type (food truck, pop-up, etc.)

**Sorting Options**
- Date (chronological)
- Truck name (alphabetical)
- Distance from user
- Popularity (by confidence score)

### 5.3 Responsive Design

**Mobile-First Approach**
- Touch-friendly map controls
- Swipeable event cards
- Collapsible filter panel
- Optimized for 320px+ screens

**Desktop Enhancements**
- Side-by-side map and list views
- Advanced filtering options
- Keyboard navigation support

---

## 6) Technical Implementation

### 6.1 Build Process

**Jekyll Data Plugin** (`_plugins/data_fetcher.rb`)
```ruby
module Jekyll
  class DataFetcher < Generator
    def generate(site)
      # Fetch from Supabase
      events = fetch_events_from_supabase
      
      # Geocode missing locations
      geocoded_events = geocode_events(events)
      
      # Write to _data/events.json
      File.write('_data/events.json', geocoded_events.to_json)
    end
  end
end
```

**Environment Configuration** (`.env`)
```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GOOGLE_MAPS_API_KEY=your-maps-key
GOOGLE_GEOCODING_API_KEY=your-geocoding-key
SITE_URL=https://your-domain.com
```

### 6.2 Data Processing

**Event Enrichment Pipeline**
1. Fetch events from Supabase
2. Check geocoding cache
3. Geocode missing addresses
4. Update cache with new coordinates
5. Generate static pages

**Geocoding Strategy**
- Cache results in `_data/geocoded_locations.json`
- Batch geocoding requests to minimize API calls
- Fallback to existing lat/lng from database
- Handle geocoding failures gracefully

### 6.3 Static Generation

**Jekyll Collections**
```yaml
# _config.yml
collections:
  events:
    output: true
    permalink: /events/:name/
  trucks:
    output: true
    permalink: /trucks/:name/
```

**Liquid Templates**
- Event pages with full details
- Truck pages with event history
- Category/archive pages
- Search results pages

---

## 7) UI/UX Design

### 7.1 Homepage Layout

```
┌─────────────────────────────────────┐
│ Header: Logo + Navigation           │
├─────────────────────────────────────┤
│ Hero: "Find Food Trucks in PGH"     │
├─────────────────────────────────────┤
│ Quick Filters: Date + Location     │
├─────────────────────────────────────┤
│ Map View (60%) | Event List (40%)   │
│ [Interactive Map] | [Event Cards]   │
├─────────────────────────────────────┤
│ Featured Trucks Carousel           │
├─────────────────────────────────────┤
│ Footer: Links + Contact             │
└─────────────────────────────────────┘
```

### 7.2 Event Card Design

```
┌─────────────────────────────────────┐
│ 🚚 Truck Name    📅 Oct 15, 2-6pm  │
├─────────────────────────────────────┤
│ 📍 Venue Name                      │
│    123 Main St, Pittsburgh, PA     │
├─────────────────────────────────────┤
│ [View on Map] [Get Directions]     │
└─────────────────────────────────────┘
```

### 7.3 Mobile Navigation

```
┌─────────────────────────────────────┐
│ ☰ Menu  🗺️ Map  🔍 Search         │
├─────────────────────────────────────┤
│ Filter Panel (Collapsible)          │
│ • Date Range                        │
│ • Truck Name                        │
│ • Distance                          │
└─────────────────────────────────────┘
```

---

## 8) Performance & SEO

### 8.1 Performance Optimization

**Static Generation**
- Pre-build all pages at build time
- Optimize images with Jekyll image processing
- Minify CSS/JS assets
- Implement service worker for offline viewing

**Map Performance**
- Lazy load Google Maps API
- Cluster markers for dense areas
- Limit initial map bounds to Pittsburgh area
- Cache map tiles locally

### 8.2 SEO Strategy

**Meta Tags**
- Dynamic titles: "Blue Sparrow at Market Square - Oct 15"
- Open Graph tags for social sharing
- Structured data (JSON-LD) for events
- Canonical URLs for all pages

**Content Strategy**
- Unique content for each truck page
- Event descriptions and truck bios
- Location-based landing pages
- RSS feed for event updates

---

## 9) Deployment & Hosting

### 9.1 Build Pipeline

**GitHub Actions Workflow**
```yaml
name: Build and Deploy
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
      - name: Install dependencies
        run: bundle install
      - name: Fetch data and build
        run: bundle exec jekyll build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          GOOGLE_MAPS_API_KEY: ${{ secrets.GOOGLE_MAPS_API_KEY }}
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
```

### 9.2 Hosting Options

**Primary**: GitHub Pages
- Free hosting for public repos
- Automatic builds on push
- Custom domain support

**Alternative**: Netlify
- More build flexibility
- Form handling capabilities
- Advanced caching options

---

## 10) Configuration & Environment

### 10.1 Jekyll Configuration (`_config.yml`)

```yaml
# Site settings
title: "Pittsburgh Food Trucks"
description: "Find food trucks and events in Pittsburgh"
url: "https://pghfoodtrucks.com"
baseurl: ""

# Build settings
markdown: kramdown
highlighter: rouge
permalink: pretty

# Plugins
plugins:
  - jekyll-feed
  - jekyll-sitemap
  - jekyll-seo-tag

# Collections
collections:
  events:
    output: true
    permalink: /events/:name/
  trucks:
    output: true
    permalink: /trucks/:name/

# Defaults
defaults:
  - scope:
      path: ""
      type: "events"
    values:
      layout: "event"
  - scope:
      path: ""
      type: "trucks"
    values:
      layout: "truck"

# Sass
sass:
  style: compressed
  load_paths:
    - _sass
```

### 10.2 Environment Variables

```dotenv
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Google Maps APIs
GOOGLE_MAPS_API_KEY=your-maps-key
GOOGLE_GEOCODING_API_KEY=your-geocoding-key

# Site Configuration
SITE_URL=https://pghfoodtrucks.com
BUILD_FREQUENCY=6h
CACHE_DURATION=24h

# Optional Features
ENABLE_ANALYTICS=true
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX
```

---

## 11) Development Workflow

### 11.1 Local Development

```bash
# Setup
git clone <repo>
cd pgh-food-trucks-frontend
bundle install

# Environment
cp .env.example .env
# Edit .env with your API keys

# Development server
bundle exec jekyll serve --livereload

# Build for production
bundle exec jekyll build
```

### 11.2 Data Management

**Manual Data Refresh**
```bash
# Fetch latest data from Supabase
bundle exec ruby _plugins/fetch_data.rb

# Geocode new locations
bundle exec ruby _plugins/geocode_locations.rb

# Build site with fresh data
bundle exec jekyll build
```

**Automated Updates**
- GitHub Actions runs every 6 hours
- Fetches latest events from Supabase
- Geocodes new locations
- Rebuilds and deploys site

---

## 12) Testing & Quality Assurance

### 12.1 Testing Strategy

**Data Validation**
- Verify all events have valid dates
- Check geocoding accuracy
- Validate truck information completeness

**User Experience Testing**
- Mobile responsiveness across devices
- Map interaction performance
- Filter functionality accuracy
- Page load speeds

**SEO Testing**
- Meta tag validation
- Structured data testing
- Sitemap generation
- RSS feed validation

### 12.2 Monitoring

**Performance Metrics**
- Page load times
- Map rendering performance
- API response times
- Build duration

**Content Quality**
- Event data freshness
- Geocoding accuracy
- Broken link detection
- Image optimization

---

## 13) Future Enhancements

### 13.1 Phase 2 Features

**Enhanced Interactivity**
- Real-time event updates via webhooks
- User location-based recommendations
- Event reminders and notifications
- Social sharing integration

**Advanced Features**
- Event calendar view
- Truck following/favorites
- User reviews and ratings
- Integration with food delivery apps

### 13.2 Technical Improvements

**Performance**
- Progressive Web App (PWA) capabilities
- Advanced caching strategies
- CDN integration
- Image optimization

**Analytics**
- User behavior tracking
- Popular truck/event analytics
- Geographic usage patterns
- Performance monitoring

---

## 14) Success Metrics

### 14.1 Technical KPIs

- Site load time < 3 seconds
- 99.9% uptime
- Mobile performance score > 90
- SEO score > 95

### 14.2 User Experience KPIs

- Event discovery rate > 80%
- Map interaction rate > 60%
- Mobile usage > 70%
- Return visitor rate > 40%

### 14.3 Content KPIs

- Event data freshness < 6 hours
- Geocoding accuracy > 95%
- Complete truck profiles > 90%
- Active events displayed > 50

---

## 15) Risk Mitigation

### 15.1 Technical Risks

**API Dependencies**
- Supabase downtime → Cache last known good data
- Google Maps quota → Implement request batching
- Geocoding failures → Fallback to database coordinates

**Performance Risks**
- Large dataset → Implement pagination
- Map rendering → Use marker clustering
- Build timeouts → Optimize data processing

### 15.2 Content Risks

**Data Quality**
- Missing event data → Graceful degradation
- Inaccurate geocoding → Manual verification process
- Stale information → Regular refresh schedule

**User Experience**
- Map loading issues → Progressive enhancement
- Mobile performance → Responsive design testing
- Accessibility → WCAG compliance

---

## 16) Definition of Done

### 16.1 Technical Requirements

- [ ] Jekyll site builds successfully with Supabase data
- [ ] Google Maps integration works on all devices
- [ ] All events display with accurate locations
- [ ] Filtering and sorting functions correctly
- [ ] Mobile-responsive design implemented
- [ ] SEO optimization complete
- [ ] Automated deployment pipeline working

### 16.2 Content Requirements

- [ ] All active trucks have complete profiles
- [ ] Events display with accurate dates and locations
- [ ] Geocoding accuracy verified for major venues
- [ ] RSS feed generates correctly
- [ ] Sitemap includes all pages

### 16.3 Performance Requirements

- [ ] Site loads in < 3 seconds
- [ ] Map renders in < 2 seconds
- [ ] Mobile performance score > 90
- [ ] All images optimized
- [ ] CSS/JS minified

---

*This PRD serves as the technical specification for building a comprehensive food truck events website using Jekyll, Supabase, and Google Maps integration.*
