require 'httparty'
require 'json'
require 'dotenv'

# Load environment variables
Dotenv.load

module Jekyll
  class DataFetcher < Generator
    safe true
    priority :high

    def generate(site)
      # Only fetch data if we're in production or if data files don't exist
      if should_fetch_data?
        Jekyll.logger.info "DataFetcher:", "Fetching data from Supabase..."
        
        # Fetch events from Supabase
        events = fetch_events_from_supabase(site)
        
        # Geocode missing locations
        geocoded_events = geocode_events(events, site)
        
        # Write to _data/events.json
        write_data_file('_data/events.json', geocoded_events)
        
        # Extract unique trucks
        trucks = extract_trucks_from_events(geocoded_events)
        write_data_file('_data/trucks.json', trucks)
        
        Jekyll.logger.info "DataFetcher:", "Data fetch complete. #{geocoded_events.length} events, #{trucks.length} trucks"
      else
        Jekyll.logger.info "DataFetcher:", "Skipping data fetch (data files exist and not in production)"
      end
    end

    def should_fetch_data?
      # Only fetch in production or if data files don't exist
      return true if ENV['JEKYLL_ENV'] == 'production'
      
      events_file = '_data/events.json'
      
      # Fetch if events file doesn't exist or is older than 1 hour
      return true unless File.exist?(events_file)
      
      file_age = Time.now - File.mtime(events_file)
      file_age > 3600 # 1 hour
    end

    private

    def fetch_events_from_supabase(site)
      supabase_url = ENV['SUPABASE_URL']
      supabase_key = ENV['SUPABASE_ANON_KEY']
      
      Jekyll.logger.info "DataFetcher:", "Supabase URL: #{supabase_url ? 'SET' : 'NOT SET'}"
      Jekyll.logger.info "DataFetcher:", "Supabase Key: #{supabase_key ? 'SET' : 'NOT SET'}"
      
      return [] unless supabase_url && supabase_key
      
      begin
        api_url = "#{supabase_url}/rest/v1/public_events"
        Jekyll.logger.info "DataFetcher:", "Making request to: #{api_url}"
        
        response = HTTParty.get(
          api_url,
          headers: {
            'apikey' => supabase_key,
            'Authorization' => "Bearer #{supabase_key}",
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
            'Accept-Encoding' => 'identity'
          },
          query: {
            'select' => '*',
            'order' => 'start_ts.asc'
          },
          timeout: 30
        )
        
        Jekyll.logger.info "DataFetcher:", "Response code: #{response.code}"
        Jekyll.logger.info "DataFetcher:", "Response body: #{response.body[0..200]}..." if response.body
        
      if response.success?
        events = response.parsed_response || []
        Jekyll.logger.info "DataFetcher:", "Successfully fetched #{events.length} events"
        events
      else
        Jekyll.logger.error "DataFetcher:", "Failed to fetch events: #{response.code} - #{response.message}"
        Jekyll.logger.error "DataFetcher:", "Response body: #{response.body}"
        []
      end
      rescue => e
        Jekyll.logger.error "DataFetcher:", "Error fetching events: #{e.message}"
        []
      end
    end

    def geocode_events(events, site)
      geocoding_api_key = ENV['GOOGLE_GEOCODING_API_KEY'] || ENV['GOOGLE_MAPS_API_KEY']
      return events unless geocoding_api_key
      
      # Load existing geocoded locations cache
      cache_file = '_data/geocoded_locations.json'
      geocoded_cache = load_geocoded_cache(cache_file)
      
      geocoded_events = events.map do |event|
        # Check if we already have geocoded data
        cache_key = "#{event['venue']}_#{event['raw_address']}_#{event['city']}"
        
        if geocoded_cache[cache_key]
          event.merge(geocoded_cache[cache_key])
        elsif event['lat'] && event['lng'] && event['lat'] != 0 && event['lng'] != 0
          # Use existing coordinates
          event
        else
          # Geocode the location
          geocoded = geocode_location(event, geocoding_api_key)
          if geocoded
            geocoded_cache[cache_key] = geocoded
            event.merge(geocoded)
          else
            event
          end
        end
      end
      
      # Save updated cache
      write_data_file(cache_file, geocoded_cache)
      
      geocoded_events
    end

    def geocode_location(event, api_key)
      address = "#{event['venue']}, #{event['raw_address']}, #{event['city']}, PA"
      
      begin
        response = HTTParty.get(
          'https://maps.googleapis.com/maps/api/geocode/json',
          query: {
            'address' => address,
            'key' => api_key
          },
          timeout: 10
        )
        
        if response.success? && response.parsed_response['status'] == 'OK'
          result = response.parsed_response['results'].first
          {
            'lat' => result['geometry']['location']['lat'],
            'lng' => result['geometry']['location']['lng'],
            'formatted_address' => result['formatted_address']
          }
        else
          Jekyll.logger.warn "DataFetcher:", "Geocoding failed for #{address}: #{response.parsed_response['status']}"
          nil
        end
      rescue => e
        Jekyll.logger.error "DataFetcher:", "Geocoding error for #{address}: #{e.message}"
        nil
      end
    end

    def extract_trucks_from_events(events)
      trucks = {}
      
      events.each do |event|
        truck_name = event['truck_name']
        next unless truck_name
        
        unless trucks[truck_name]
          trucks[truck_name] = {
            'name' => truck_name,
            'slug' => truck_name.downcase.gsub(/[^a-z0-9]+/, '-').gsub(/^-|-$/, ''),
            'events' => [],
            'total_events' => 0,
            'last_seen' => nil
          }
        end
        
        trucks[truck_name]['events'] << event
        trucks[truck_name]['total_events'] += 1
        
        if !trucks[truck_name]['last_seen'] || event['start_ts'] > trucks[truck_name]['last_seen']
          trucks[truck_name]['last_seen'] = event['start_ts']
        end
      end
      
      trucks.values
    end

    def load_geocoded_cache(cache_file)
      return {} unless File.exist?(cache_file)
      
      begin
        JSON.parse(File.read(cache_file))
      rescue => e
        Jekyll.logger.warn "DataFetcher:", "Could not load geocoded cache: #{e.message}"
        {}
      end
    end

    def write_data_file(file_path, data)
      FileUtils.mkdir_p(File.dirname(file_path))
      File.write(file_path, JSON.pretty_generate(data))
    end
  end
end
