// Map and event handlers only - events are server-rendered
class FoodTruckApp {
  constructor() {
    this.map = null;
    this.markers = [];
    this.infoWindows = [];
    this.events = [];
    
    // Pittsburgh coordinates and distance filter
    this.pittsburghLat = 40.4406;
    this.pittsburghLng = -79.9959;
    this.maxDistanceMiles = 100;
    
    this.init();
  }
  
  async init() {
    try {
      this.initializeMap();
      this.getEventsFromPage();
      this.setupEventHandlers();
      this.addEventMarkers();
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  }
  
  getEventsFromPage() {
    // Get events from server-rendered HTML
    const eventCards = document.querySelectorAll('.event-card');
    this.events = [];
    
    eventCards.forEach(card => {
      const button = card.querySelector('[data-event-id]');
      if (button) {
        // Get all the data we need from the rendered HTML
        const truckElement = card.querySelector('.event-card__truck');
        const venueElement = card.querySelector('.event-card__venue');
        const locationElement = card.querySelector('.event-card__location');
        
        // Extract address from location element
        let raw_address = '';
        let city = '';
        
        if (locationElement && !locationElement.classList.contains('event-card__location--unavailable')) {
          const locationText = locationElement.textContent.replace('📍 ', '');
          // If it contains a comma, split it (raw_address, city format)
          if (locationText.includes(',')) {
            const parts = locationText.split(',');
            raw_address = parts[0].trim();
            city = parts[1]?.trim() || '';
          } else {
            // Use the full text as address (formatted_address format)
            raw_address = locationText;
            city = '';
          }
        }
        
        // Find the full event data from window.siteData
        const eventId = button.dataset.eventId;
        const fullEventData = window.siteData?.events?.find(e => e.id === eventId) || {};
        
        const event = {
          id: button.dataset.eventId,
          lat: parseFloat(button.dataset.lat),
          lng: parseFloat(button.dataset.lng),
          truck_name: truckElement ? truckElement.textContent : '',
          venue: venueElement ? venueElement.textContent : '',
          raw_address: raw_address,
          city: city,
          start_ts: fullEventData.start_ts,
          end_ts: fullEventData.end_ts,
          source_url: fullEventData.source_url
        };
        
        // Filter events within 100 miles of Pittsburgh
        if (this.isWithinDistance(event)) {
          this.events.push(event);
        } else {
          console.log(`🚫 Filtering out event ${event.truck_name} at ${event.venue} (${event.city}) - too far from Pittsburgh`);
        }
      }
    });
    
    console.log(`Found ${this.events.length} events within ${this.maxDistanceMiles} miles of Pittsburgh`);
    return this.events;
  }
  
  isWithinDistance(event) {
    // Skip events without valid coordinates
    if (!event.lat || !event.lng || event.lat === 0 || event.lng === 0) {
      return false;
    }
    
    const distance = this.calculateDistance(
      this.pittsburghLat, 
      this.pittsburghLng, 
      event.lat, 
      event.lng
    );
    
    return distance <= this.maxDistanceMiles;
  }
  
  calculateDistance(lat1, lng1, lat2, lng2) {
    // Haversine formula to calculate distance between two points
    // Returns distance in miles
    
    // Convert to radians
    const lat1Rad = lat1 * Math.PI / 180;
    const lng1Rad = lng1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lng2Rad = lng2 * Math.PI / 180;
    
    // Earth's radius in miles
    const earthRadius = 3959;
    
    // Calculate differences
    const dlat = lat2Rad - lat1Rad;
    const dlng = lng2Rad - lng1Rad;
    
    // Haversine formula
    const a = Math.sin(dlat/2)**2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dlng/2)**2;
    const c = 2 * Math.asin(Math.sqrt(a));
    
    // Distance in miles
    return earthRadius * c;
  }
  
  formatEventDateTime(startTs, endTs) {
    if (!startTs) return 'Time TBD';
    
    const startDate = new Date(startTs);
    const endDate = endTs ? new Date(endTs) : null;
    
    // Format date to match event cards (e.g., "Sep 27")
    const dateOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    const dateStr = startDate.toLocaleDateString('en-US', dateOptions);
    
    // Format time in 24-hour format to match event cards (e.g., "09:08")
    const startTime = startDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    let timeStr = startTime;
    if (endDate && endDate.getTime() !== startDate.getTime()) {
      const endTime = endDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      timeStr = `${startTime} - ${endTime}`;
    } else {
      timeStr = `${startTime}+`;
    }
    
    return `${dateStr} ${timeStr}`;
  }
  
  initializeMap() {
    if (typeof google === 'undefined') {
      console.error('Google Maps API not loaded');
      return;
    }
    
    const mapElement = document.getElementById('main-map');
    if (!mapElement) return;
    
    // Default to Pittsburgh center
    const pittsburgh = { lat: 40.4406, lng: -79.9959 };
    
    this.map = new google.maps.Map(mapElement, {
      zoom: 12,
      center: pittsburgh,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.TOP_LEFT
      },
      styles: [
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        }
      ]
    });
    
    this.addEventMarkers();
  }
  
  setupEventHandlers() {
    // Add click handlers for "View on Map" buttons
    document.querySelectorAll('[data-event-id]').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        const eventId = button.dataset.eventId;
        const lat = parseFloat(button.dataset.lat);
        const lng = parseFloat(button.dataset.lng);
        
        this.focusOnEvent({ id: eventId, lat: lat, lng: lng });
      });
    });
  }
  
  addEventMarkers() {
    // Clear existing markers and info windows
    this.clearMarkers();
    
    if (!this.map) {
      console.error('Map not initialized');
      return;
    }
    
    console.log(`Adding markers for ${this.events.length} events`);
    
    const bounds = new google.maps.LatLngBounds();
    let hasValidLocation = false;
    let validEvents = 0;
    
    this.events.forEach((event, index) => {
      if (event.lat && event.lng && event.lat !== 0 && event.lng !== 0) {
        const position = { lat: parseFloat(event.lat), lng: parseFloat(event.lng) };
        console.log(`Creating marker ${index + 1}: ${event.truck_name} at ${position.lat}, ${position.lng}`);
        
        const eventDateTime = this.formatEventDateTime(event.start_ts, event.end_ts);
        
        const marker = new google.maps.Marker({
          position: position,
          map: this.map,
          title: `${event.truck_name} at ${event.venue} - ${eventDateTime}`,
          icon: {
            url: (window.siteBaseUrl || '') + '/assets/images/pin.png',
            scaledSize: new google.maps.Size(32, 32),
            anchor: new google.maps.Point(16, 32)
          }
        });
        
        const infoWindow = new google.maps.InfoWindow({
          content: this.createInfoWindowContent(event)
        });
        
        marker.addListener('click', () => {
          this.closeAllInfoWindows();
          infoWindow.open(this.map, marker);
        });
        
        this.markers.push(marker);
        this.infoWindows.push(infoWindow);
        bounds.extend(position);
        hasValidLocation = true;
        validEvents++;
      } else {
        console.log(`Skipping event ${index + 1}: ${event.truck_name} - invalid coordinates (${event.lat}, ${event.lng})`);
      }
    });
    
    console.log(`Created ${validEvents} markers`);
    
    // Fit map to show all markers
    if (hasValidLocation && this.markers.length > 0) {
      this.map.fitBounds(bounds);
      
      // Don't zoom in too much if there's only one marker
      if (this.markers.length === 1) {
        this.map.setZoom(15);
      }
    } else {
      console.log('No valid locations found for markers');
    }
  }
  
  clearMarkers() {
    // Remove all markers from map
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers = [];
    
    // Close all info windows
    this.infoWindows.forEach(infoWindow => {
      infoWindow.close();
    });
    this.infoWindows = [];
  }
  
  closeAllInfoWindows() {
    this.infoWindows.forEach(infoWindow => {
      infoWindow.close();
    });
  }
  
  createInfoWindowContent(event) {
    const eventDateTime = this.formatEventDateTime(event.start_ts, event.end_ts);
    
    // Determine the source platform and create appropriate link text
    let sourceLinkText = 'View Source';
    if (event.source_url) {
      if (event.source_url.includes('instagram.com')) {
        sourceLinkText = 'View on Instagram';
      } else if (event.source_url.includes('facebook.com')) {
        sourceLinkText = 'View on Facebook';
      } else if (event.source_url.includes('twitter.com') || event.source_url.includes('x.com')) {
        sourceLinkText = 'View on Twitter';
      }
    }
    
    return `
      <div class="map-info">
        <h3 class="map-info__title">${event.truck_name}</h3>
        <p class="map-info__venue">${event.venue}</p>
        <p class="map-info__datetime">📅 ${eventDateTime}</p>
        <p class="map-info__address">${event.raw_address}${event.city ? ', ' + event.city : ''}</p>
        <div class="map-info__actions">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}" target="_blank" class="btn btn--small btn--secondary">Directions</a>
          ${event.source_url ? `<a href="${event.source_url}" target="_blank" class="btn btn--small btn--primary">${sourceLinkText}</a>` : ''}
        </div>
      </div>
    `;
  }
  
  
  focusOnEvent(event) {
    if (!this.map) return;
    
    // Find the marker for this event
    const markerIndex = this.markers.findIndex(marker => {
      const position = marker.getPosition();
      return position.lat() === parseFloat(event.lat) && position.lng() === parseFloat(event.lng);
    });
    
    if (markerIndex !== -1) {
      const marker = this.markers[markerIndex];
      const infoWindow = this.infoWindows[markerIndex];
      
      // Close all other info windows
      this.closeAllInfoWindows();
      
      // Open the info window for this marker
      infoWindow.open(this.map, marker);
      
      // Center the map on this marker
      this.map.setCenter(marker.getPosition());
      this.map.setZoom(16);
    }
  }
  
  
  showError(message) {
    const eventsList = document.getElementById('events-list');
    if (eventsList) {
      eventsList.innerHTML = `
        <div class="empty">
          <div class="empty__icon">⚠️</div>
          <h3 class="empty__title">Error</h3>
          <p class="empty__description">${message}</p>
        </div>
      `;
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.foodTruckApp = new FoodTruckApp();
});

// Global function for initialization
function initMapAndHandlers() {
  if (window.foodTruckApp) {
    return window.foodTruckApp;
  }
  window.foodTruckApp = new FoodTruckApp();
  return window.foodTruckApp;
}

// Global functions for individual event/truck pages
function initEventMap(mapId, eventData) {
  if (typeof google === 'undefined') {
    console.error('Google Maps API not loaded');
    return;
  }
  
  const mapElement = document.getElementById(mapId);
  if (!mapElement) return;
  
  const map = new google.maps.Map(mapElement, {
    zoom: 15,
    center: { lat: parseFloat(eventData.lat), lng: parseFloat(eventData.lng) },
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true
  });
  
  const marker = new google.maps.Marker({
    position: { lat: parseFloat(eventData.lat), lng: parseFloat(eventData.lng) },
    map: map,
    title: `${eventData.truck} at ${eventData.venue}`,
    icon: {
      url: (window.siteBaseUrl || '') + '/assets/images/pin.png',
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 32)
    }
  });
  
  const infoWindow = new google.maps.InfoWindow({
    content: `
      <div>
        <h3>${eventData.truck}</h3>
        <p><strong>${eventData.venue}</strong></p>
        <p>${eventData.time}</p>
      </div>
    `
  });
  
  infoWindow.open(map, marker);
}

function initTruckMap(mapId, events) {
  if (typeof google === 'undefined') {
    console.error('Google Maps API not loaded');
    return;
  }
  
  const mapElement = document.getElementById(mapId);
  if (!mapElement) return;
  
  // Pittsburgh coordinates for distance filtering
  const pittsburghLat = 40.4406;
  const pittsburghLng = -79.9959;
  const maxDistanceMiles = 100;
  
  // Distance calculation function
  function calculateDistance(lat1, lng1, lat2, lng2) {
    const lat1Rad = lat1 * Math.PI / 180;
    const lng1Rad = lng1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const lng2Rad = lng2 * Math.PI / 180;
    
    const earthRadius = 3959;
    const dlat = lat2Rad - lat1Rad;
    const dlng = lng2Rad - lng1Rad;
    
    const a = Math.sin(dlat/2)**2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dlng/2)**2;
    const c = 2 * Math.asin(Math.sqrt(a));
    
    return earthRadius * c;
  }
  
  // Filter events within 100 miles of Pittsburgh
  const filteredEvents = events.filter(event => {
    if (!event.lat || !event.lng || event.lat === 0 || event.lng === 0) {
      return false;
    }
    
    const distance = calculateDistance(pittsburghLat, pittsburghLng, event.lat, event.lng);
    return distance <= maxDistanceMiles;
  });
  
  console.log(`Filtered truck events: ${filteredEvents.length} within ${maxDistanceMiles} miles of Pittsburgh (from ${events.length} total)`);
  
  const bounds = new google.maps.LatLngBounds();
  const map = new google.maps.Map(mapElement, {
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true
  });
  
  // Date formatting helper function
  function formatEventDateTime(startTs, endTs) {
    if (!startTs) return 'Time TBD';
    
    const startDate = new Date(startTs);
    const endDate = endTs ? new Date(endTs) : null;
    
    // Format date to match event cards (e.g., "Sep 27")
    const dateOptions = { 
      month: 'short', 
      day: 'numeric' 
    };
    const dateStr = startDate.toLocaleDateString('en-US', dateOptions);
    
    // Format time in 24-hour format to match event cards (e.g., "09:08")
    const startTime = startDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    
    let timeStr = startTime;
    if (endDate && endDate.getTime() !== startDate.getTime()) {
      const endTime = endDate.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      timeStr = `${startTime} - ${endTime}`;
    } else {
      timeStr = `${startTime}+`;
    }
    
    return `${dateStr} ${timeStr}`;
  }
  
  filteredEvents.forEach(event => {
    if (event.lat && event.lng) {
      const position = { lat: parseFloat(event.lat), lng: parseFloat(event.lng) };
      const eventDateTime = formatEventDateTime(event.start_ts, event.end_ts);
      
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: `${event.venue} - ${eventDateTime}`,
        icon: {
          url: (window.siteBaseUrl || '') + '/assets/images/pin.png',
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        }
      });
      
      // Determine the source platform and create appropriate link text
      let sourceLinkText = 'View Source';
      if (event.source_url) {
        if (event.source_url.includes('instagram.com')) {
          sourceLinkText = 'View on Instagram';
        } else if (event.source_url.includes('facebook.com')) {
          sourceLinkText = 'View on Facebook';
        } else if (event.source_url.includes('twitter.com') || event.source_url.includes('x.com')) {
          sourceLinkText = 'View on Twitter';
        }
      }
      
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div>
            <h3>${event.venue}</h3>
            <p><strong>📅 ${eventDateTime}</strong></p>
            <div style="margin-top: 10px;">
              ${event.source_url ? `<a href="${event.source_url}" target="_blank" class="btn btn--small btn--primary">${sourceLinkText}</a>` : ''}
            </div>
          </div>
        `
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      bounds.extend(position);
    }
  });
  
  if (filteredEvents.length > 0) {
    map.fitBounds(bounds);
  }
}