# Use an ARM-compatible Ruby image
FROM ruby:3.4-slim

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory inside the container
WORKDIR /srv/jekyll

# Install Jekyll and Bundler system-wide first (cached in layers)
RUN gem install bundler jekyll webrick

# Copy only Gemfile first (to leverage Docker caching)
COPY Gemfile ./

# Install dependencies before copying the rest of the project
RUN bundle install

# Copy the rest of the Jekyll site files
COPY . . 

# Expose port 4000 for Jekyll
EXPOSE 4000

# Default entrypoint to use bundle exec
ENTRYPOINT ["bundle", "exec", "jekyll"]
