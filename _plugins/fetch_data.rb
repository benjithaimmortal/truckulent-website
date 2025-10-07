#!/usr/bin/env ruby

require 'httparty'
require 'json'
require 'dotenv'

# Load environment variables
Dotenv.load

class DataFetcher
  def initialize
    @supabase_url = ENV['SUPABASE_URL']
    @supabase_key = ENV['SUPABASE_ANON_KEY']
    @geocoding_key = ENV['GOOGLE_GEOCODING_API_KEY'] || ENV['GOOGLE_MAPS_API_KEY']
  end
  
  def fetch_and_process
    puts "🚀 Starting data fetch process..."
    
    # Fetch events from Supabase
    events = fetch_events
    puts "📊 Fetched #{events.length} events from Supabase"
    
    # Geocode missing locations
    geocoded_events = geocode_events(events)
    puts "📍 Geocoded #{geocoded_events.count { |e| e['lat'] && e['lng'] }} events"
    
    # Write events data
    write_data_file('_data/events.json', geocoded_events)
    puts "💾 Saved events to _data/events.json"
    
    # Extract and save trucks data
    trucks = extract_trucks(geocoded_events)
    write_data_file('_data/trucks.json', trucks)
    puts "🚚 Saved #{trucks.length} trucks to _data/trucks.json"
    
    puts "✅ Data fetch complete!"
  end
  
  private
  
  def fetch_events
    return [] unless @supabase_url && @supabase_key
    
    begin
      response = HTTParty.get(
        "#{@supabase_url}/rest/v1/public_events",
        headers: {
          'apikey' => @supabase_key,
          'Authorization' => "Bearer #{@supabase_key}",
          'Content-Type' => 'application/json'
        },
        query: {
          'select' => '*',
          'order' => 'start_ts.asc'
        },
        timeout: 30
      )
      
      if response.success?
        response.parsed_response
      else
        puts "❌ Failed to fetch events: #{response.code} - #{response.message}"
        []
      end
    rescue => e
      puts "❌ Error fetching events: #{e.message}"
      []
    end
  end
  
  def geocode_events(events)
    return events unless @geocoding_key
    
    # Load existing geocoded cache
    cache = load_geocoded_cache
    
    geocoded_events = events.map do |event|
      # Check if we already have geocoded data
      cache_key = "#{event['venue']}_#{event['raw_address']}_#{event['city']}"
      
      if cache[cache_key]
        puts "📍 Using cached coordinates for #{event['venue']}"
        event.merge(cache[cache_key])
      elsif event['lat'] && event['lng'] && event['lat'] != 0 && event['lng'] != 0
        # Use existing coordinates
        event
      else
        # Geocode the location
        puts "🌍 Geocoding #{event['venue']}..."
        geocoded = geocode_location(event)
        if geocoded
          cache[cache_key] = geocoded
          event.merge(geocoded)
        else
          event
        end
      end
    end
    
    # Save updated cache
    write_data_file('_data/geocoded_locations.json', cache)
    
    geocoded_events
  end
  
  def geocode_location(event)
    address = "#{event['venue']}, #{event['raw_address']}, #{event['city']}, PA"
    
    begin
      response = HTTParty.get(
        'https://maps.googleapis.com/maps/api/geocode/json',
        query: {
          'address' => address,
          'key' => @geocoding_key
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
        puts "⚠️  Geocoding failed for #{address}: #{response.parsed_response['status']}"
        nil
      end
    rescue => e
      puts "❌ Geocoding error for #{address}: #{e.message}"
      nil
    end
  end
  
  def extract_trucks(events)
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
  
  def load_geocoded_cache
    cache_file = '_data/geocoded_locations.json'
    return {} unless File.exist?(cache_file)
    
    begin
      JSON.parse(File.read(cache_file))
    rescue => e
      puts "⚠️  Could not load geocoded cache: #{e.message}"
      {}
    end
  end
  
  def write_data_file(file_path, data)
    FileUtils.mkdir_p(File.dirname(file_path))
    File.write(file_path, JSON.pretty_generate(data))
  end
end

# Run the fetcher if this script is executed directly
if __FILE__ == $0
  fetcher = DataFetcher.new
  fetcher.fetch_and_process
end
