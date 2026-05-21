const { query } = require('../config/database');
const RegisteredToilet = require('../models/RegisteredToilet');
const Gatherer = require('../models/Gatherer');
const IllegalDumpSite = require('../models/IllegalDumpSite');
const WasteFacility = require('../models/WasteFacility');
const OdEvent = require('../models/OdEvent');
const WeatherHistory = require('../models/WeatherHistory');

function toFeature(row, geometryFields, properties) {
  const lat = parseFloat(row[geometryFields.lat]);
  const lon = parseFloat(row[geometryFields.lon]);
  if (!lat || !lon) return null;
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [lon, lat] },
    properties,
  };
}

function fc(features, meta = {}) {
  const valid = features.filter(Boolean);
  return { type: 'FeatureCollection', features: valid, meta: { count: valid.length, generated_at: new Date().toISOString(), ...meta } };
}

async function toilets(req, res, next) {
  try {
    const { district } = req.query;
    const rows = await RegisteredToilet.findAll({ district: district || undefined, limit: 500 });
    const features = rows.map(r => toFeature(r, { lat: 'latitude', lon: 'longitude' }, {
      id: r.id, name: r.owner_name, toilet_type: r.toilet_type,
      ownership_type: r.ownership_type, condition: r.condition,
      district: r.district, community: r.community,
      is_verified: r.is_verified, num_users: r.num_users,
      layer: 'toilets',
    }));
    res.json(fc(features, { layer: 'toilets' }));
  } catch (e) { next(e); }
}

async function gatherers(req, res, next) {
  try {
    const { district } = req.query;
    const rows = await Gatherer.findAll({ district: district || undefined, is_active: true, limit: 200 });
    const features = rows.map(r => toFeature(r, { lat: 'current_lat', lon: 'current_lon' }, {
      id: r.id, name: r.full_name, phone: r.phone,
      district: r.district, vehicle_type: r.vehicle_type,
      is_available: r.is_available, waste_types: r.waste_types,
      last_location_at: r.last_location_at, layer: 'gatherers',
    }));
    res.json(fc(features, { layer: 'gatherers' }));
  } catch (e) { next(e); }
}

async function dumps(req, res, next) {
  try {
    const { district, status } = req.query;
    const rows = await IllegalDumpSite.findAll({
      district: district || undefined,
      status: status || 'open',
      limit: 500,
    });
    const features = rows.map(r => toFeature(r, { lat: 'latitude', lon: 'longitude' }, {
      id: r.id, district: r.district, community: r.community,
      severity: r.severity, waste_types: r.waste_types,
      estimated_volume_m3: r.estimated_volume_m3,
      status: r.status, description: r.description, layer: 'dumps',
    }));
    res.json(fc(features, { layer: 'dumps' }));
  } catch (e) { next(e); }
}

async function facilities(req, res, next) {
  try {
    const { district } = req.query;
    const rows = await WasteFacility.findAll({ district: district || undefined, limit: 200 });
    const features = rows.map(r => toFeature(r, { lat: 'latitude', lon: 'longitude' }, {
      id: r.id, name: r.name, facility_type: r.facility_type,
      operator: r.operator, district: r.district,
      capacity_m3: r.capacity_m3, current_load_pct: r.current_load_pct,
      status: r.status, layer: 'facilities',
    }));
    res.json(fc(features, { layer: 'facilities' }));
  } catch (e) { next(e); }
}

async function alerts(req, res, next) {
  try {
    const { district } = req.query;
    let sql = `SELECT su.id, su.name, su.latitude, su.longitude, su.district, su.community,
      a.severity, a.alert_type, a.message, a.created_at AS alert_at
      FROM alerts a JOIN sanitation_units su ON a.unit_id=su.id
      WHERE a.status='active' AND su.latitude IS NOT NULL AND su.longitude IS NOT NULL`;
    const params = [];
    if (district) { sql += ` AND su.district=$1`; params.push(district); }
    sql += ' ORDER BY a.created_at DESC LIMIT 200';
    const { rows } = await query(sql, params);
    const features = rows.map(r => toFeature(r, { lat: 'latitude', lon: 'longitude' }, {
      id: r.id, name: r.name, district: r.district, community: r.community,
      severity: r.severity, alert_type: r.alert_type,
      message: r.message, alert_at: r.alert_at, layer: 'alerts',
    }));
    res.json(fc(features, { layer: 'alerts' }));
  } catch (e) { next(e); }
}

async function heatmap(req, res, next) {
  try {
    const type = req.params.type;
    const { district } = req.query;
    let rows = [];

    if (type === 'weather') {
      rows = await WeatherHistory.latestPerDistrict();
      const DISTRICT_COORDS = {
        'Tamale Metro': { lat: 9.4008, lon: -0.8393 },
        'Sagnarigu': { lat: 9.4505, lon: -0.8379 },
        'Tolon': { lat: 9.4569, lon: -1.0789 },
        'Kumbungu': { lat: 9.5457, lon: -0.9779 },
        'Nanton': { lat: 9.8012, lon: -0.6948 },
        'Savelugu': { lat: 9.6244, lon: -0.8241 },
        'Karaga': { lat: 10.0113, lon: -0.4363 },
        'Gushegu': { lat: 10.1728, lon: -0.2191 },
        'Yendi': { lat: 9.4418, lon: -0.0105 },
        'Northern': { lat: 9.4084, lon: -0.8527 },
      };
      const features = rows.map(r => {
        const coords = DISTRICT_COORDS[r.district] || { lat: r.latitude, lon: r.longitude };
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [coords.lon || r.longitude, coords.lat || r.latitude] },
          properties: {
            district: r.district, precipitation_mm: r.precipitation_mm,
            temperature_c: r.temperature_c, humidity_pct: r.humidity_pct,
            intensity: Math.min(1, (r.precipitation_mm || 0) / 50),
            layer: 'weather',
          },
        };
      }).filter(f => f.geometry.coordinates[0] && f.geometry.coordinates[1]);
      return res.json(fc(features, { layer: 'weather_heatmap' }));
    }

    if (type === 'od_events') {
      const odRows = await OdEvent.findAll({ district: district || undefined, limit: 500 });
      const features = odRows.map(r => toFeature(r, { lat: 'latitude', lon: 'longitude' }, {
        id: r.id, district: r.district, community: r.community,
        severity: r.severity, near_school: r.near_school,
        school_name: r.school_name, status: r.status, layer: 'od_events',
      }));
      return res.json(fc(features, { layer: 'od_events_heatmap' }));
    }

    if (type === 'sanitation') {
      let sql = `SELECT su.id, su.name, su.latitude, su.longitude, su.district,
        su.status, su.flood_zone_risk,
        COALESCE(sr.fill_level_percent, 0) AS fill_level
        FROM sanitation_units su
        LEFT JOIN LATERAL (
          SELECT fill_level_percent FROM sensor_readings
          WHERE unit_id=su.id ORDER BY recorded_at DESC LIMIT 1
        ) sr ON true
        WHERE su.latitude IS NOT NULL AND su.longitude IS NOT NULL`;
      const params = [];
      if (district) { sql += ` AND su.district=$1`; params.push(district); }
      const { rows: sRows } = await query(sql, params);
      const features = sRows.map(r => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [parseFloat(r.longitude), parseFloat(r.latitude)] },
        properties: {
          id: r.id, name: r.name, district: r.district, status: r.status,
          fill_level: r.fill_level, flood_zone_risk: r.flood_zone_risk,
          intensity: (r.fill_level || 0) / 100, layer: 'sanitation',
        },
      }));
      return res.json(fc(features, { layer: 'sanitation_heatmap' }));
    }

    res.status(400).json({ success: false, message: 'Invalid heatmap type. Use: weather, od_events, sanitation' });
  } catch (e) { next(e); }
}

async function vulnerabilityLayer(req, res, next) {
  try {
    const { district } = req.query;
    const conds = ['latitude IS NOT NULL AND longitude IS NOT NULL'];
    const params = [];
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    const where = `WHERE ${conds.join(' AND ')}`;

    const [tRows, uRows] = await Promise.all([
      query(`SELECT id, owner_name AS name, district, community, latitude, longitude,
                    vulnerability_score, vulnerability_factors, condition,
                    NULL::text AS flood_zone_risk
             FROM registered_toilets ${where}`, params),
      query(`SELECT id, name, district, location_name AS community, latitude, longitude,
                    vulnerability_score, vulnerability_factors, status, flood_zone_risk
             FROM sanitation_units ${where}`, params),
    ]);

    const scoreColor = s => s >= 75 ? 'critical' : s >= 50 ? 'high' : s >= 25 ? 'moderate' : 'low';

    const features = [
      ...tRows.rows.map(r => toFeature(r, { lat: 'latitude', lon: 'longitude' }, {
        id: r.id, name: r.name, asset_type: 'toilet', district: r.district,
        community: r.community, vulnerability_score: r.vulnerability_score || 0,
        vulnerability_factors: r.vulnerability_factors,
        risk_band: scoreColor(r.vulnerability_score || 0),
        condition: r.condition, flood_zone_risk: r.flood_zone_risk, layer: 'vulnerability',
      })),
      ...uRows.rows.map(r => toFeature(r, { lat: 'latitude', lon: 'longitude' }, {
        id: r.id, name: r.name, asset_type: 'sanitation_unit', district: r.district,
        community: r.community, vulnerability_score: r.vulnerability_score || 0,
        vulnerability_factors: r.vulnerability_factors,
        risk_band: scoreColor(r.vulnerability_score || 0),
        status: r.status, flood_zone_risk: r.flood_zone_risk, layer: 'vulnerability',
      })),
    ];
    res.json(fc(features, { layer: 'vulnerability' }));
  } catch (e) { next(e); }
}

async function allLayers(req, res, next) {
  try {
    const { district } = req.query;
    const mockReq = { query: { district } };
    const collect = (handler) => new Promise((resolve, reject) => {
      handler(mockReq, { json: resolve }, reject);
    });

    const [toiletsData, gatherersData, dumpsData, facilitiesData, alertsData, vulnData] = await Promise.allSettled([
      collect(toilets), collect(gatherers), collect(dumps), collect(facilities), collect(alerts), collect(vulnerabilityLayer),
    ]);

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      layers: {
        toilets: toiletsData.status === 'fulfilled' ? toiletsData.value : { features: [] },
        gatherers: gatherersData.status === 'fulfilled' ? gatherersData.value : { features: [] },
        dumps: dumpsData.status === 'fulfilled' ? dumpsData.value : { features: [] },
        facilities: facilitiesData.status === 'fulfilled' ? facilitiesData.value : { features: [] },
        alerts: alertsData.status === 'fulfilled' ? alertsData.value : { features: [] },
        vulnerability: vulnData.status === 'fulfilled' ? vulnData.value : { features: [] },
      },
    });
  } catch (e) { next(e); }
}

module.exports = { toilets, gatherers, dumps, facilities, alerts, heatmap, allLayers, vulnerabilityLayer };
