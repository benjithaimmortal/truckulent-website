module Jekyll
  class DataInjector < Generator
    safe true
    priority :high

    def generate(site)
      # Inject events data into site config for JavaScript access
      if site.data['events'] && site.data['events'].is_a?(Array)
        site.config['events_data'] = site.data['events']
        Jekyll.logger.info "DataInjector:", "Injected #{site.data['events'].length} events into site config"
      end
    end
  end
end
