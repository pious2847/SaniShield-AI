const axios = require('axios');

const DISTRICT_COORDS = {
  'Tamale Metro':  { lat: 9.4008, lon: -0.8393 },
  'Sagnarigu':     { lat: 9.4505, lon: -0.8379 },
  'Tolon':         { lat: 9.4569, lon: -1.0789 },
  'Kumbungu':      { lat: 9.5457, lon: -0.9779 },
  'Nanton':        { lat: 9.8012, lon: -0.6948 },
  'Savelugu':      { lat: 9.6244, lon: -0.8241 },
  'Karaga':        { lat: 10.0113, lon: -0.4363 },
  'Gushegu':       { lat: 10.1728, lon: -0.2191 },
  'Yendi':         { lat: 9.4418, lon: -0.0105 },
  'Northern':      { lat: 9.4084, lon: -0.8527 },
};

function matchDistrict(lat, lon) {
  let closest = 'Tamale Metro';
  let minDist = Infinity;
  for (const [d, c] of Object.entries(DISTRICT_COORDS)) {
    const dist = Math.sqrt(Math.pow(lat - c.lat, 2) + Math.pow(lon - c.lon, 2));
    if (dist < minDist) { minDist = dist; closest = d; }
  }
  return closest;
}

async function reverseGeocode(lat, lon) {
  // Use Google Maps if key is configured, else fallback to Nominatim (free)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
        params: {
          latlng: `${lat},${lon}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
          result_type: 'sublocality|locality|administrative_area_level_2',
        },
        timeout: 5000,
      });
      const results = response.data?.results;
      if (results?.length) {
        const components = results[0].address_components;
        const get = (type) => components?.find(c => c.types.includes(type))?.long_name;
        return {
          location_name: results[0].formatted_address,
          community: get('sublocality') || get('locality') || get('neighborhood'),
          city: get('locality'),
          district_hint: get('administrative_area_level_2'),
          source: 'google',
        };
      }
    } catch (err) {
      console.error('[Geocode] Google Maps error:', err.message);
    }
  }

  // Nominatim fallback (free, OpenStreetMap)
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon, format: 'json', zoom: 14, addressdetails: 1 },
      headers: { 'User-Agent': 'NEXUS-SanitationMonitor/2.0 (Northern Ghana)' },
      timeout: 6000,
    });
    const d = response.data;
    const addr = d?.address || {};
    return {
      location_name: d.display_name,
      community: addr.suburb || addr.village || addr.town || addr.hamlet,
      city: addr.city || addr.town,
      district_hint: addr.county || addr.state_district,
      source: 'nominatim',
    };
  } catch (err) {
    console.error('[Geocode] Nominatim error:', err.message);
  }

  return null;
}

async function enrichLocation(lat, lon, providedDistrict, providedCommunity) {
  const district = providedDistrict || matchDistrict(parseFloat(lat), parseFloat(lon));
  let community = providedCommunity || null;
  let location_name = null;
  let geocode_data = null;

  if (lat && lon) {
    const geo = await reverseGeocode(parseFloat(lat), parseFloat(lon));
    if (geo) {
      community = community || geo.community;
      location_name = geo.location_name;
      geocode_data = geo;
    }
  }

  return { district, community, location_name, geocode_data };
}

module.exports = { reverseGeocode, matchDistrict, enrichLocation };
