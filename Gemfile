source "https://rubygems.org"

# Jekyll
gem "jekyll", "~> 4.3.0"

# Jekyll plugins
gem "jekyll-feed", "~> 0.12"
gem "jekyll-sitemap", "~> 1.4"
gem "jekyll-seo-tag", "~> 2.8"

# HTTP client for Supabase
gem "httparty", "~> 0.21"

# JSON handling
gem "json", "~> 2.6"

# Environment variables
gem "dotenv", "~> 2.8"

# Ruby 3.4 compatibility - add removed standard library gems
gem "logger"
gem "base64"

# Development dependencies
group :jekyll_plugins do
  # Custom plugins are in _plugins/ directory
end

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance improvements
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds since newer versions of the gem
# do not have a Java counterpart.
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]
