#!/usr/bin/env ruby
require 'httparty'
require 'json'
require 'dotenv'
require 'fileutils'

# Load environment variables
Dotenv.load

class DataFetcher
  def initialize
    @supabase_url = ENV['SUPABASE_URL']
    @supabase_key = ENV['SUPABASE_ANON_KEY']
    @data_dir = File.join(Dir.pwd, '_data')
    @lock_file = File.join(@data_dir, '.data_fetcher_lock')
  end

  def run
    puts "🚚 Starting data fetch process..."
    puts "📡 Fetching fresh data from Supabase..."
    
    # Create lock file to prevent concurrent runs
    create_lock_file
    
    begin
      # Fetch events from Supabase
      events = fetch_events_from_supabase
      
      if events.empty?
        puts "⚠️  No events fetched from Supabase"
        return
      end
      
      puts "✅ Fetched #{events.length} events from Supabase"
      
      # Write to _data/events.json
      write_data_file(File.join(@data_dir, 'events.json'), events)
      puts "💾 Saved events to _data/events.json"
      
      # Extract unique trucks
      trucks = extract_trucks_from_events(events)
      write_data_file(File.join(@data_dir, 'trucks.json'), trucks)
      puts "🚛 Extracted #{trucks.length} trucks to _data/trucks.json"
      
      puts "✅ Data fetch complete: #{events.length} events, #{trucks.length} trucks"
      
    rescue => e
      puts "❌ Error during data fetch: #{e.message}"
      puts e.backtrace.join("\n")
      exit 1
    ensure
      # Remove lock file
      remove_lock_file
    end
  end

  private

  def create_lock_file
    FileUtils.mkdir_p(@data_dir)
    File.write(@lock_file, Time.now.to_s)
  end

  def remove_lock_file
    File.delete(@lock_file) if File.exist?(@lock_file)
  end

  def fetch_events_from_supabase
    puts "🔗 Supabase URL: #{@supabase_url ? 'SET' : 'NOT SET'}"
    puts "🔑 Supabase Key: #{@supabase_key ? 'SET' : 'NOT SET'}"
    
    return [] unless @supabase_url && @supabase_key
    
    begin
      api_url = "#{@supabase_url}/rest/v1/public_events"
      puts "🌐 Making request to: #{api_url}"
      
      response = HTTParty.get(
        api_url,
        headers: {
          'apikey' => @supabase_key,
          'Authorization' => "Bearer #{@supabase_key}",
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
      
      puts "📊 Response code: #{response.code}"
      puts "📄 Response preview: #{response.body[0..200]}..." if response.body
      
      if response.success?
        events = response.parsed_response || []
        puts "✅ Successfully fetched #{events.length} events"
        events
      else
        puts "❌ Failed to fetch events: #{response.code} - #{response.message}"
        puts "📄 Response body: #{response.body}"
        []
      end
    rescue => e
      puts "❌ Error fetching events: #{e.message}"
      []
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


  def write_data_file(file_path, data)
    FileUtils.mkdir_p(File.dirname(file_path))
    File.write(file_path, JSON.pretty_generate(data))
  end
end

# Run the data fetcher
if __FILE__ == $0
  fetcher = DataFetcher.new
  fetcher.run
end
