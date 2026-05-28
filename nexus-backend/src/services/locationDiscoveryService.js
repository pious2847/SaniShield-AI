/**
 * Agentic location discovery service.
 * Sources: Overpass API (OpenStreetMap, free) + Google Places API.
 * Saves discovered toilets → registered_toilets
 * Saves discovered waste facilities → waste_facilities
 * Uses Gemini to classify/enrich ambiguous results.
 */

const axios = require('axios');
const { randomUUID: uuidv4 } = require('crypto');
const { query } = require('../config/database');
const { safeGenerate } = require('./geminiService');

// ── Constants ─────────────────────────────────────────────────────────────────

// Nominatim (OSM geocoding API) — free, no key, no billing required
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// viewbox format for Nominatim: west,south,east,north
const NOMINATIM_VIEWBOX = '-1.5,8.8,0.5,11.2';

// Bounding box covering all Northern Region districts (south,west,north,east) — kept for reference
const NORTH_GHANA_BBOX = '8.8,-1.5,11.2,0.5';

const DISTRICT_CENTERS = {
  'Northern':      { lat: 9.4084, lon: -0.8527 },
  'Tamale Metro':  { lat: 9.4008, lon: -0.8393 },
  'Sagnarigu':     { lat: 9.4505, lon: -0.8379 },
  'Tolon':         { lat: 9.4569, lon: -1.0789 },
  'Kumbungu':      { lat: 9.5457, lon: -0.9779 },
  'Nanton':        { lat: 9.8012, lon: -0.6948 },
  'Savelugu':      { lat: 9.6244, lon: -0.8241 },
  'Karaga':        { lat: 10.0113, lon: -0.4363 },
  'Gushegu':       { lat: 10.1728, lon: -0.2191 },
  'Yendi':         { lat: 9.4418, lon: -0.0105 },
};

const DISTRICTS = Object.keys(DISTRICT_CENTERS);

// ── Helpers ───────────────────────────────────────────────────────────────────

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestDistrict(lat, lon) {
  let nearest = 'Tamale Metro';
  let minDist = Infinity;
  for (const [name, c] of Object.entries(DISTRICT_CENTERS)) {
    const d = haversineKm(lat, lon, c.lat, c.lon);
    if (d < minDist) { minDist = d; nearest = name; }
  }
  return nearest;
}

async function isDuplicateToilet(lat, lon) {
  const res = await query(
    `SELECT id FROM registered_toilets
     WHERE ABS(latitude - $1) < 0.001 AND ABS(longitude - $2) < 0.001
     LIMIT 1`,
    [lat, lon]
  );
  return res.rows.length > 0;
}

async function isDuplicateFacility(lat, lon) {
  const res = await query(
    `SELECT id FROM waste_facilities
     WHERE ABS(latitude - $1) < 0.001 AND ABS(longitude - $2) < 0.001
     LIMIT 1`,
    [lat, lon]
  );
  return res.rows.length > 0;
}

// ── Overpass API ──────────────────────────────────────────────────────────────

async function queryNominatim(params) {
  // Nominatim requires a descriptive User-Agent and a 1req/s rate limit
  const response = await axios.get(NOMINATIM_URL, {
    params: {
      format: 'jsonv2',
      bounded: 1,
      viewbox: NOMINATIM_VIEWBOX,
      countrycodes: 'gh',
      limit: 50,
      addressdetails: 1,
      ...params,
    },
    headers: { 'User-Agent': 'NEXUS-SanitationMonitor/2.0 Northern Ghana WASH Platform (hafis@namibra.io)' },
    timeout: 20000,
  });
  return response.data ?? [];
}

async function fetchOsmToilets() {
  console.log('[Discovery:Nominatim] Querying toilets...');
  const results = await queryNominatim({ amenity: 'toilets' });
  console.log(`[Discovery:Nominatim] Toilets found: ${results.length}`);
  // Normalise to { lat, lon, tags: { name, ... } } shape expected by saveDiscoveredToilet
  return results.map(r => ({
    id: `nominatim_${r.osm_id}`,
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
    tags: { name: r.display_name?.split(',')[0], ...r.address },
  }));
}

async function fetchOsmWasteFacilities() {
  console.log('[Discovery:Nominatim] Querying waste facilities...');
  const amenities = ['waste_disposal', 'recycling', 'waste_transfer_station'];
  const all = [];
  for (const amenity of amenities) {
    try {
      const results = await queryNominatim({ amenity });
      all.push(...results.map(r => ({
        id: `nominatim_${r.osm_id}`,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        tags: { name: r.display_name?.split(',')[0], amenity, ...r.address },
      })));
      await new Promise(r => setTimeout(r, 1100)); // Nominatim: 1 req/s
    } catch (err) {
      console.warn(`[Discovery:Nominatim] amenity=${amenity} failed: ${err.message}`);
    }
  }
  console.log(`[Discovery:Nominatim] Waste facilities found: ${all.length}`);
  return all;
}

// ── Google Places API ─────────────────────────────────────────────────────────

async function fetchGooglePlaces(textQuery, lat, lon) {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return [];

  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: textQuery,
        location: `${lat},${lon}`,
        radius: 30000,
        key,
      },
      timeout: 15000,
    });
    if (res.data?.status === 'REQUEST_DENIED') {
      console.warn('[Discovery:Places] REQUEST_DENIED — enable the Places API at console.cloud.google.com → APIs & Services → Enable APIs → "Places API"');
      return [];
    }
    return res.data?.results ?? [];
  } catch (err) {
    console.warn(`[Discovery:Places] Query "${textQuery}" failed:`, err.message);
    return [];
  }
}

async function fetchGooglePlacesForAllDistricts(searchTerms) {
  const results = [];
  for (const [district, center] of Object.entries(DISTRICT_CENTERS)) {
    for (const term of searchTerms) {
      const places = await fetchGooglePlaces(`${term} ${district} Ghana`, center.lat, center.lon);
      results.push(...places.map(p => ({ ...p, _district: district })));
      await new Promise(r => setTimeout(r, 300)); // avoid rate limits
    }
  }
  return results;
}

// ── Gemini enrichment ─────────────────────────────────────────────────────────

async function enrichWithGemini(places, type) {
  if (!places.length) return places;

  const sample = places.slice(0, 20).map((p, i) => ({
    idx: i,
    name: p.name || p.tags?.name || 'Unknown',
    tags: p.tags || {},
    vicinity: p.vicinity || '',
  }));

  const prompt = `You are analyzing discovered ${type} locations in Northern Ghana for a WASH sanitation platform.
For each location below, classify it and return a JSON array.
Each item: { "idx": number, "keep": true/false, "condition": "good|fair|poor|unknown", "sub_type": string, "notes": string }
- keep=true only if it's clearly a ${type} relevant to sanitation in Northern Ghana
- condition: estimate from name/tags if possible, otherwise "unknown"
- sub_type: for toilets: "pit_latrine|flush_toilet|public_toilet|unknown"; for facilities: "waste_disposal|landfill|transfer_station|recycling|other"
- notes: any useful context (max 60 chars)

Locations:
${JSON.stringify(sample, null, 2)}

Return ONLY a valid JSON array. No markdown.`;

  try {
    const raw = await safeGenerate(prompt);
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const classified = JSON.parse(cleaned);
    return places.map((p, i) => {
      const info = classified.find(c => c.idx === i);
      return info ? { ...p, _gemini: info } : { ...p, _gemini: { keep: true, condition: 'unknown' } };
    });
  } catch {
    return places.map(p => ({ ...p, _gemini: { keep: true, condition: 'unknown' } }));
  }
}

// ── Savers ────────────────────────────────────────────────────────────────────

async function saveDiscoveredToilet(place, source) {
  const lat = place.lat ?? place.geometry?.location?.lat;
  const lon = place.lon ?? place.lng ?? place.geometry?.location?.lng;
  if (!lat || !lon) return false;

  if (await isDuplicateToilet(lat, lon)) return false;

  const gemini = place._gemini || {};
  if (gemini.keep === false) return false;

  const district = nearestDistrict(lat, lon);
  const name = place.tags?.name || place.name || `Discovered Toilet — ${district}`;

  let toiletType = 'other';
  const sub = (gemini.sub_type || '').toLowerCase();
  if (sub.includes('pit') || (place.tags?.['toilets:disposal'] === 'pitlatrine')) toiletType = 'pit_latrine';
  else if (sub.includes('flush') || place.tags?.flush === 'yes') toiletType = 'flush_toilet';
  else if (sub.includes('public')) toiletType = 'other';

  await query(
    `INSERT INTO registered_toilets
       (id, owner_name, owner_phone, toilet_type, ownership_type, location_name, district,
        community, latitude, longitude, condition, num_users, has_water, is_verified, source, external_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT DO NOTHING`,
    [
      uuidv4(),
      'Discovered via Maps',
      'N/A',
      toiletType,
      place.tags?.['access'] === 'private' ? 'private_business' : 'public',
      name,
      district,
      place.tags?.['addr:suburb'] || place.vicinity?.split(',')[0] || null,
      lat, lon,
      gemini.condition || 'unknown',
      0,
      place.tags?.['drinking_water'] === 'yes' ? true : false,
      false,
      source,
      String(place.id || place.place_id || ''),
    ]
  );
  return true;
}

async function saveDiscoveredFacility(place, source) {
  const lat = place.lat ?? place.geometry?.location?.lat;
  const lon = place.lon ?? place.lng ?? place.geometry?.location?.lng;
  if (!lat || !lon) return false;

  if (await isDuplicateFacility(lat, lon)) return false;

  const gemini = place._gemini || {};
  if (gemini.keep === false) return false;

  const district = nearestDistrict(lat, lon);
  const name = place.tags?.name || place.name || `Discovered Facility — ${district}`;

  const subType = gemini.sub_type || place.tags?.amenity || 'other';
  const facilityTypeMap = {
    landfill: 'landfill', waste_disposal: 'faecal_sludge_management',
    transfer_station: 'transfer_station', recycling: 'composting', other: 'other',
  };
  const facilityType = facilityTypeMap[subType] || 'other';

  await query(
    `INSERT INTO waste_facilities
       (id, name, facility_type, district, community, latitude, longitude, status, source, external_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ON CONFLICT DO NOTHING`,
    [
      uuidv4(), name, facilityType, district,
      place.tags?.['addr:suburb'] || null,
      lat, lon,
      'operational',
      source,
      String(place.id || place.place_id || ''),
      gemini.notes || null,
    ]
  );
  return true;
}

// ── Discovery run ─────────────────────────────────────────────────────────────

async function runDiscovery() {
  const startAt = Date.now();
  const stats = {
    overpass: { toilets_found: 0, toilets_saved: 0, facilities_found: 0, facilities_saved: 0 },
    google:   { toilets_found: 0, toilets_saved: 0, facilities_found: 0, facilities_saved: 0 },
  };

  console.log('[Discovery] Starting agentic location discovery...');

  // ── Phase 1: Nominatim (OpenStreetMap geocoding — free, no billing) ─────────
  console.log('[Discovery] Phase 1: Querying Nominatim (OpenStreetMap)...');

  try {
    let osmToilets = await fetchOsmToilets();
    stats.overpass.toilets_found = osmToilets.length;
    if (osmToilets.length) {
      osmToilets = await enrichWithGemini(osmToilets, 'toilet');
      for (const place of osmToilets) {
        const saved = await saveDiscoveredToilet(place, 'osm_discovery');
        if (saved) stats.overpass.toilets_saved++;
      }
    }
  } catch (err) {
    console.error('[Discovery:Nominatim:Toilets] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 1500));

  try {
    let osmFacilities = await fetchOsmWasteFacilities();
    stats.overpass.facilities_found = osmFacilities.length;
    if (osmFacilities.length) {
      osmFacilities = await enrichWithGemini(osmFacilities, 'waste facility');
      for (const place of osmFacilities) {
        const saved = await saveDiscoveredFacility(place, 'osm_discovery');
        if (saved) stats.overpass.facilities_saved++;
      }
    }
  } catch (err) {
    console.error('[Discovery:Nominatim:Facilities] Error:', err.message);
  }

  // ── Phase 2: Google Places API ─────────────────────────────────────────────
  const hasPlacesKey = !!(process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  if (hasPlacesKey) {
    console.log('[Discovery] Phase 2: Querying Google Places API...');

    try {
      const toiletQueries = ['public toilet', 'KVIP toilet', 'community toilet', 'latrine'];
      let gToilets = await fetchGooglePlacesForAllDistricts(toiletQueries);
      // Deduplicate by place_id before enrichment
      const seenIds = new Set();
      gToilets = gToilets.filter(p => {
        if (!p.place_id || seenIds.has(p.place_id)) return false;
        seenIds.add(p.place_id);
        return true;
      });
      console.log(`[Discovery:Places] Unique toilet places found: ${gToilets.length}`);
      stats.google.toilets_found = gToilets.length;

      if (gToilets.length) {
        gToilets = await enrichWithGemini(
          gToilets.map(p => ({
            ...p,
            lat: p.geometry?.location?.lat,
            lon: p.geometry?.location?.lng,
          })),
          'toilet'
        );
        for (const place of gToilets) {
          const saved = await saveDiscoveredToilet(place, 'google_places_discovery');
          if (saved) stats.google.toilets_saved++;
        }
      }
    } catch (err) {
      console.error('[Discovery:Places:Toilets] Error:', err.message);
    }

    try {
      const facilityQueries = ['waste disposal site', 'refuse dump', 'waste management', 'refuse collection point'];
      let gFacilities = await fetchGooglePlacesForAllDistricts(facilityQueries);
      const seenIds = new Set();
      gFacilities = gFacilities.filter(p => {
        if (!p.place_id || seenIds.has(p.place_id)) return false;
        seenIds.add(p.place_id);
        return true;
      });
      console.log(`[Discovery:Places] Unique facility places found: ${gFacilities.length}`);
      stats.google.facilities_found = gFacilities.length;

      if (gFacilities.length) {
        gFacilities = await enrichWithGemini(
          gFacilities.map(p => ({
            ...p,
            lat: p.geometry?.location?.lat,
            lon: p.geometry?.location?.lng,
          })),
          'waste facility'
        );
        for (const place of gFacilities) {
          const saved = await saveDiscoveredFacility(place, 'google_places_discovery');
          if (saved) stats.google.facilities_saved++;
        }
      }
    } catch (err) {
      console.error('[Discovery:Places:Facilities] Error:', err.message);
    }
  } else {
    console.log('[Discovery] Skipping Google Places (no API key configured)');
  }

  // ── Record run ─────────────────────────────────────────────────────────────
  const duration = Date.now() - startAt;
  const totalToilets  = stats.overpass.toilets_saved  + stats.google.toilets_saved;
  const totalFacilities = stats.overpass.facilities_saved + stats.google.facilities_saved;

  try {
    await query(
      `INSERT INTO discovery_runs
         (id, source, toilets_found, toilets_saved, facilities_found, facilities_saved, districts_covered, duration_ms)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uuidv4(),
        'overpass+google_places',
        stats.overpass.toilets_found  + stats.google.toilets_found,
        totalToilets,
        stats.overpass.facilities_found + stats.google.facilities_found,
        totalFacilities,
        DISTRICTS,
        duration,
      ]
    );
  } catch { /* non-fatal */ }

  console.log(`[Discovery] Complete in ${(duration / 1000).toFixed(1)}s — toilets saved: ${totalToilets}, facilities saved: ${totalFacilities}`);
  return { stats, duration_ms: duration };
}

async function getDiscoveryStats() {
  const [runs, toilets, facilities] = await Promise.all([
    query(`SELECT * FROM discovery_runs ORDER BY run_at DESC LIMIT 10`),
    query(`SELECT COUNT(*) AS count FROM registered_toilets WHERE source LIKE '%discovery%'`),
    query(`SELECT COUNT(*) AS count FROM waste_facilities WHERE source LIKE '%discovery%'`),
  ]);
  return {
    recent_runs: runs.rows,
    total_discovered_toilets: parseInt(toilets.rows[0]?.count || 0),
    total_discovered_facilities: parseInt(facilities.rows[0]?.count || 0),
  };
}

module.exports = { runDiscovery, getDiscoveryStats, DISTRICTS };
