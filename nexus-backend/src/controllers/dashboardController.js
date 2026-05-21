const SanitationUnit = require('../models/SanitationUnit');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const Prediction = require('../models/Prediction');
const { getWeatherForDistrict } = require('../services/weatherService');
const CommunityHealthScore = require('../models/CommunityHealthScore');
const Broadcast = require('../models/Broadcast');
const NewsArticle = require('../models/NewsArticle');
const OdEvent = require('../models/OdEvent');
const { query } = require('../config/database');
const { getCronStatus } = require('../services/cronService');

async function getOverview(req, res, next) {
  try {
    const [units, latestReadings, criticalReadings, alertSummary, highRiskPredictions, byDistrict] = await Promise.all([
      SanitationUnit.findAll(),
      SensorReading.latestAllUnits(),
      SensorReading.criticalReadings(),
      Alert.countActive(),
      Prediction.activeHighRisk(),
      SanitationUnit.countByDistrict(),
    ]);

    const totalAlerts = alertSummary.reduce((a, r) => a + parseInt(r.count), 0);
    const criticalAlerts = parseInt(alertSummary.find(r => r.severity === 'critical')?.count || 0);
    const avgFill = latestReadings.length
      ? Math.round(latestReadings.reduce((a, r) => a + r.fill_level_percent, 0) / latestReadings.length)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          total_units: units.length,
          operational: units.filter(u => u.status === 'operational').length,
          critical_units: units.filter(u => u.status === 'critical').length,
          school_units: units.filter(u => u.is_school).length,
          total_active_alerts: totalAlerts,
          critical_alerts: criticalAlerts,
          avg_fill_level_percent: avgFill,
          high_risk_predictions: highRiskPredictions.length,
          units_with_sensor_data: latestReadings.length,
        },
        by_district: byDistrict,
        critical_units: criticalReadings.slice(0, 10),
        high_risk_predictions: highRiskPredictions.slice(0, 10).map(Prediction.parse),
        gis_data: latestReadings.map(r => ({
          unit_id: r.unit_id,
          unit_name: r.unit_name,
          district: r.district,
          location_name: r.location_name,
          latitude: r.latitude,
          longitude: r.longitude,
          fill_level: r.fill_level_percent,
          water_level: r.water_level_cm,
          flood_zone_risk: r.flood_zone_risk,
          unit_status: r.unit_status,
          is_school: r.is_school,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getGisData(req, res, next) {
  try {
    const { district } = req.query;
    const [units, latestReadings, activeAlerts, predictions] = await Promise.all([
      SanitationUnit.findAll({ district }),
      SensorReading.latestAllUnits(),
      Alert.findAll({ status: 'active', district, limit: 200 }),
      Prediction.activeHighRisk(),
    ]);

    const readingMap = {};
    latestReadings.forEach(r => { readingMap[r.unit_id] = r; });

    const alertMap = {};
    activeAlerts.forEach(a => {
      if (!alertMap[a.unit_id]) alertMap[a.unit_id] = [];
      alertMap[a.unit_id].push(a);
    });

    const predictionMap = {};
    predictions.forEach(p => { predictionMap[p.unit_id] = p; });

    const gisFeatures = units.map(u => {
      const reading = readingMap[u.id] || {};
      const alerts = alertMap[u.id] || [];
      const prediction = predictionMap[u.id];

      let markerColor = '#4DA0DA';
      if (u.status === 'critical' || alerts.some(a => a.severity === 'critical')) markerColor = '#D32F2F';
      else if (alerts.some(a => a.severity === 'danger')) markerColor = '#F57C00';
      else if (reading.fill_level_percent >= 60) markerColor = '#FBC02D';

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [u.longitude, u.latitude] },
        properties: {
          id: u.id,
          name: u.name,
          unit_type: u.unit_type,
          location_name: u.location_name,
          district: u.district,
          status: u.status,
          flood_zone_risk: u.flood_zone_risk,
          is_school: u.is_school,
          school_name: u.school_name,
          fill_level: reading.fill_level_percent || null,
          water_level: reading.water_level_cm || null,
          active_alerts: alerts.length,
          highest_alert_severity: alerts[0]?.severity || null,
          ai_risk_level: prediction?.risk_level || null,
          marker_color: markerColor,
        },
      };
    });

    res.json({
      success: true,
      data: { type: 'FeatureCollection', features: gisFeatures },
    });
  } catch (err) {
    next(err);
  }
}

async function getWeatherSummary(req, res, next) {
  try {
    const districts = ['Northern', 'Tamale Metro', 'Sagnarigu', 'Savelugu', 'Yendi'];
    const results = await Promise.allSettled(
      districts.map(d => getWeatherForDistrict(d).then(w => ({ district: d, weather: w })))
    );
    const weatherData = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    res.json({ success: true, data: weatherData });
  } catch (err) {
    next(err);
  }
}

async function getFullDashboard(req, res, next) {
  try {
    const [
      units, latestReadings, alertSummary, highRiskPredictions, byDistrict,
      healthScores, activeGatherers, openDumps, odNearSchool, recentBroadcasts, recentNews,
    ] = await Promise.allSettled([
      SanitationUnit.findAll({ limit: 200 }),
      SensorReading.latestAllUnits(),
      Alert.countActive(),
      Prediction.activeHighRisk(),
      SanitationUnit.countByDistrict(),
      CommunityHealthScore.latestAll(),
      query(`SELECT COUNT(*) AS c FROM gatherers WHERE is_active=true AND is_available=true`),
      query(`SELECT COUNT(*) AS c FROM illegal_dump_sites WHERE status='open'`),
      OdEvent.nearSchools(500),
      Broadcast.recent(24),
      NewsArticle.recent(5),
    ]);

    const val = (r, def) => r.status === 'fulfilled' ? r.value : def;

    const unitsList = val(units, []);
    const readings = val(latestReadings, []);
    const alerts = val(alertSummary, []);
    const predictions = val(highRiskPredictions, []);
    const scores = val(healthScores, []).map(CommunityHealthScore.parse);

    const totalAlerts = alerts.reduce((a, r) => a + parseInt(r.count), 0);
    const avgFill = readings.length
      ? Math.round(readings.reduce((a, r) => a + r.fill_level_percent, 0) / readings.length)
      : 0;

    res.json({
      success: true,
      generated_at: new Date().toISOString(),
      data: {
        units: {
          total: unitsList.length,
          operational: unitsList.filter(u => u.status === 'operational').length,
          critical: unitsList.filter(u => u.status === 'critical').length,
          school_units: unitsList.filter(u => u.is_school).length,
          avg_fill_level: avgFill,
        },
        alerts: {
          total_active: totalAlerts,
          critical: parseInt(alerts.find(r => r.severity === 'critical')?.count || 0),
          high_risk_predictions: predictions.length,
        },
        health_scores: scores,
        gatherers: { available: parseInt(val(activeGatherers, { rows: [{ c: 0 }] }).rows[0]?.c || 0) },
        illegal_dumps: { open: parseInt(val(openDumps, { rows: [{ c: 0 }] }).rows[0]?.c || 0) },
        unicef: {
          od_near_school: val(odNearSchool, []).length,
        },
        by_district: val(byDistrict, []),
        recent_broadcasts: val(recentBroadcasts, []),
        recent_news: val(recentNews, []),
        cron_status: getCronStatus(),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getCronStatusHandler(req, res, next) {
  try {
    res.json({ success: true, data: getCronStatus() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOverview, getGisData, getWeatherSummary, getFullDashboard, getCronStatusHandler };
