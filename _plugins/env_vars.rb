module Jekyll
  class EnvVars < Generator
    safe true
    priority :high

    def generate(site)
      # Set environment variables as site config
      site.config['google_maps_api_key'] = ENV['GOOGLE_MAPS_API_KEY']
      site.config['supabase_url'] = ENV['SUPABASE_URL']
      site.config['supabase_anon_key'] = ENV['SUPABASE_ANON_KEY']
    end
  end
end
