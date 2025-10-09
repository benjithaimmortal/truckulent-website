#!/bin/bash

# Startup script for Jekyll development
echo "🚚 Starting Pittsburgh Food Trucks development server..."

# Fetch data first
echo "📡 Fetching data..."
ruby scripts/fetch-data.rb

# Start Jekyll development server
echo "🔧 Starting Jekyll development server..."
bundle exec jekyll serve --host 0.0.0.0 --port 4000 --livereload --drafts --unpublished --incremental
