// Main application JavaScript - Simplified
class FoodTruckApp {
  constructor() {
    this.events = [];
    this.map = null;
    this.markers = [];
    this.infoWindows = [];
    
    this.init();
  }
  
  async init() {
    try {
      this.initializeMap();
      
      // Try to load events with retry logic
      await this.loadEventsWithRetry();
      
      this.renderEvents();
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to load events. Please try again later.');
    }
  }
  
  async loadEventsWithRetry(maxRetries = 5, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.loadEvents();
        if (this.events.length > 0) {
          console.log(`Successfully loaded events on attempt ${attempt}`);
          return;
        }
      } catch (error) {
        console.log(`Attempt ${attempt} failed:`, error.message);
      }
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      }
    }
    
    throw new Error(`Failed to load events after ${maxRetries} attempts`);
  }
  
  async loadEvents() {
    try {
      console.log('Attempting to load events...');
      
      // Try multiple paths and retry logic
      const paths = [
        '/_data/events.json',
        './_data/events.json',
        '/assets/data/events.json'
      ];
      
      let data = null;
      let lastError = null;
      
      for (const path of paths) {
        try {
          console.log(`Trying to fetch from: ${path}`);
          const response = await fetch(path);
          
          if (response.ok) {
            data = await response.json();
            console.log(`Successfully loaded from ${path}:`, data.length, 'events');
            break;
          } else {
            console.log(`Failed to load from ${path}: ${response.status}`);
          }
        } catch (error) {
          console.log(`Error loading from ${path}:`, error.message);
          lastError = error;
        }
      }
      
      if (data && Array.isArray(data) && data.length > 0) {
        this.events = data;
        console.log(`Successfully loaded ${this.events.length} events`);
        return;
      }
      
      // If all paths failed, try to get data from window object (if available)
      if (window.siteData && window.siteData.events) {
        this.events = window.siteData.events;
        console.log(`✅ Successfully loaded ${this.events.length} events from window.siteData`);
        return;
      } else {
        console.log('❌ window.siteData not available:', window.siteData);
      }
      
      throw lastError || new Error('No events data available from any source');
      
    } catch (error) {
      console.error('Error loading events:', error);
      // Show a more helpful error message
      this.showError('Unable to load events. The data may still be loading. Please refresh the page in a moment.');
    }
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
  
  addEventMarkers() {
    // Clear existing markers and info windows
    this.clearMarkers();
    
    if (!this.map) return;
    
    const bounds = new google.maps.LatLngBounds();
    let hasValidLocation = false;
    
    this.events.forEach(event => {
      if (event.lat && event.lng && event.lat !== 0 && event.lng !== 0) {
        const position = { lat: parseFloat(event.lat), lng: parseFloat(event.lng) };
        
        const marker = new google.maps.Marker({
          position: position,
          map: this.map,
          title: `${event.truck_name} at ${event.venue}`,
          icon: {
            url: '/assets/images/pin.png',
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
      }
    });
    
    // Fit map to show all markers
    if (hasValidLocation && this.markers.length > 0) {
      this.map.fitBounds(bounds);
      
      // Don't zoom in too much if there's only one marker
      if (this.markers.length === 1) {
        this.map.setZoom(15);
      }
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
    const startDate = new Date(event.start_ts);
    const endDate = event.end_ts ? new Date(event.end_ts) : null;
    
    const timeString = endDate 
      ? `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
      : startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    return `
      <div class="map-info">
        <h3 class="map-info__title">${event.truck_name}</h3>
        <p class="map-info__venue">${event.venue}</p>
        <p class="map-info__time">${startDate.toLocaleDateString()} • ${timeString}</p>
        <p class="map-info__address">${event.raw_address}, ${event.city}</p>
        <div class="map-info__actions">
          <a href="/events/${event.id}" class="btn btn--small btn--primary">View Details</a>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}" target="_blank" class="btn btn--small btn--secondary">Directions</a>
        </div>
      </div>
    `;
  }
  
  renderEvents() {
    const eventsList = document.getElementById('events-list');
    const eventsLoading = document.getElementById('events-loading');
    const eventsEmpty = document.getElementById('events-empty');
    
    if (!eventsList) return;
    
    // Hide loading
    if (eventsLoading) {
      eventsLoading.style.display = 'none';
    }
    
    // Clear existing content
    eventsList.innerHTML = '';
    
    if (this.events.length === 0) {
      if (eventsEmpty) {
        eventsEmpty.style.display = 'block';
      }
      return;
    }
    
    // Hide empty state
    if (eventsEmpty) {
      eventsEmpty.style.display = 'none';
    }
    
    // Render events
    this.events.forEach(event => {
      const eventElement = this.createEventElement(event);
      eventsList.appendChild(eventElement);
    });
  }
  
  createEventElement(event) {
    const startDate = new Date(event.start_ts);
    const endDate = event.end_ts ? new Date(event.end_ts) : null;
    
    const timeString = endDate 
      ? `${startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
      : startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-card';
    
    eventDiv.innerHTML = `
      <div class="event-card__date">
        <span class="date__month">${startDate.toLocaleDateString('en-US', { month: 'short' })}</span>
        <span class="date__day">${startDate.getDate()}</span>
      </div>
      
      <div class="event-card__content">
        <h3 class="event-card__venue">${event.venue}</h3>
        <p class="event-card__truck">${event.truck_name}</p>
        <p class="event-card__time">${timeString}</p>
        <p class="event-card__location">📍 ${event.raw_address}, ${event.city}</p>
      </div>
      
      <div class="event-card__actions">
        <a href="/events/${event.id}" class="btn btn--small">View Details</a>
        <a href="https://www.google.com/maps/dir/?api=1&destination=${event.lat},${event.lng}" target="_blank" class="btn btn--small btn--secondary">Directions</a>
      </div>
      
      <a href="/events/${event.id}" class="event-card__link"></a>
    `;
    
    return eventDiv;
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
function initMainApp() {
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
      url: '/assets/images/pin.png',
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
  
  const bounds = new google.maps.LatLngBounds();
  const map = new google.maps.Map(mapElement, {
    zoom: 12,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    zoomControl: true
  });
  
  events.forEach(event => {
    if (event.lat && event.lng) {
      const position = { lat: parseFloat(event.lat), lng: parseFloat(event.lng) };
      
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: `${event.venue} - ${event.date}`,
        icon: {
          url: '/assets/images/pin.png',
          scaledSize: new google.maps.Size(32, 32),
          anchor: new google.maps.Point(16, 32)
        }
      });
      
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div>
            <h3>${event.venue}</h3>
            <p><strong>${event.date}</strong></p>
            <p>${event.time}</p>
            <a href="${event.url}" class="btn btn--small btn--primary">View Details</a>
          </div>
        `
      });
      
      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
      
      bounds.extend(position);
    }
  });
  
  if (events.length > 0) {
    map.fitBounds(bounds);
  }
}