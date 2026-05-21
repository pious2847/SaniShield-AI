const SanitationUnit = require('../models/SanitationUnit');
const SensorReading = require('../models/SensorReading');
const Prediction = require('../models/Prediction');
const Alert = require('../models/Alert');
const gemini = require('../services/geminiService');
const weather = require('../services/weatherService');
const { buildAlertFromPrediction } = require('../services/alertService');

let _io;
function setIo(io) { _io = io; }

async function predictOverflow(req, res, next) {
  try {
    const unit = await SanitationUnit.findById(req.params.unitId);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const reading = await SensorReading.latestForUnit(unit.id);
    if (!reading) return res.status(400).json({ success: false, message: 'No sensor data available' });

    const trend = await SensorReading.fillRateTrend(unit.id, 6);
    const aiResult = await gemini.predictOverflowRisk(unit, reading, trend);

    await Prediction.deactivateForUnit(unit.id, 'overflow');
    const prediction = await Prediction.create({
      unit_id: unit.id,
      prediction_type: 'overflow',
      risk_level: aiResult.risk_level,
      risk_score: aiResult.risk_score,
      predicted_event_at: aiResult.predicted_overflow_hours
        ? new Date(Date.now() + aiResult.predicted_overflow_hours * 3600000).toISOString()
        : null,
      confidence_percent: aiResult.confidence_percent,
      ai_reasoning: aiResult.reasoning,
      recommendations: aiResult.recommendations,
      sensor_snapshot: reading,
    });

    const alertData = buildAlertFromPrediction(unit, prediction, aiResult);
    let alert = null;
    if (alertData) {
      alert = await Alert.create(alertData);
      if (_io) _io.emit('new_alert', { alert, unit_id: unit.id, district: unit.district });
    }

    res.json({ success: true, data: { prediction: Prediction.parse(prediction), alert, ai_result: aiResult } });
  } catch (err) {
    next(err);
  }
}

async function predictFloodRisk(req, res, next) {
  try {
    const unit = await SanitationUnit.findById(req.params.unitId);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const reading = await SensorReading.latestForUnit(unit.id);
    if (!reading) return res.status(400).json({ success: false, message: 'No sensor data available' });

    const [weatherData, trend] = await Promise.all([
      weather.getWeatherForUnit(unit),
      SensorReading.fillRateTrend(unit.id, 6),
    ]);

    const aiResult = await gemini.predictFloodRisk(unit, reading, weatherData);

    await Prediction.deactivateForUnit(unit.id, 'flood_risk');
    const prediction = await Prediction.create({
      unit_id: unit.id,
      prediction_type: 'flood_risk',
      risk_level: aiResult.risk_level,
      risk_score: aiResult.risk_score,
      predicted_event_at: aiResult.flood_intrusion_risk_hours
        ? new Date(Date.now() + aiResult.flood_intrusion_risk_hours * 3600000).toISOString()
        : null,
      confidence_percent: aiResult.confidence_percent,
      ai_reasoning: aiResult.reasoning,
      recommendations: aiResult.recommendations,
      weather_data: weatherData,
      sensor_snapshot: reading,
    });

    const alertData = buildAlertFromPrediction(unit, prediction, aiResult);
    let alert = null;
    if (alertData) {
      alert = await Alert.create(alertData);
      if (_io) _io.emit('new_alert', { alert, unit_id: unit.id, district: unit.district });
    }

    if (aiResult.evacuate_school && unit.is_school && _io) {
      _io.emit('school_evacuation_alert', {
        unit_id: unit.id,
        school_name: unit.school_name,
        district: unit.district,
        location: unit.location_name,
        message: `EVACUATE: ${unit.school_name} — Flood risk to sanitation systems detected`,
      });
    }

    res.json({ success: true, data: { prediction: Prediction.parse(prediction), alert, weather: weatherData, ai_result: aiResult } });
  } catch (err) {
    next(err);
  }
}

async function getMaintenancePlan(req, res, next) {
  try {
    const { district } = req.query;
    const [units, recentReadings] = await Promise.all([
      SanitationUnit.findAll({ district }),
      SensorReading.latestAllUnits(),
    ]);
    const plan = await gemini.generateMaintenancePlan(units, recentReadings);
    res.json({ success: true, data: { plan, units_analyzed: units.length, district: district || 'all' } });
  } catch (err) {
    next(err);
  }
}

async function getDistrictIntelligence(req, res, next) {
  try {
    const { district } = req.params;
    const [units, activeAlerts, highRiskPredictions, readings] = await Promise.all([
      SanitationUnit.findAll({ district }),
      Alert.findAll({ district, status: 'active', limit: 100 }),
      Prediction.activeHighRisk(),
      SensorReading.latestAllUnits(),
    ]);

    const districtReadings = readings.filter(r => r.district === district);
    const avgFill = districtReadings.length
      ? Math.round(districtReadings.reduce((a, r) => a + r.fill_level_percent, 0) / districtReadings.length)
      : 0;

    const stats = {
      total_units: units.length,
      critical_units: units.filter(u => u.status === 'critical').length,
      high_risk_units: units.filter(u => ['high', 'critical'].includes(u.flood_zone_risk)).length,
      active_alerts: activeAlerts.length,
      school_units_at_risk: units.filter(u => u.is_school && ['critical', 'maintenance'].includes(u.status)).length,
      recent_reports: 0,
      avg_fill_level: avgFill,
    };

    const [intelligence] = await Promise.all([gemini.generateDistrictSummary(district, stats)]);
    const districtPredictions = highRiskPredictions.filter(p => p.district === district);

    res.json({
      success: true,
      data: { district, stats, intelligence, high_risk_predictions: districtPredictions.slice(0, 5) },
    });
  } catch (err) {
    next(err);
  }
}

async function listPredictions(req, res, next) {
  try {
    const predictions = await Prediction.activeHighRisk();
    res.json({ success: true, data: predictions.map(Prediction.parse), count: predictions.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { predictOverflow, predictFloodRisk, getMaintenancePlan, getDistrictIntelligence, listPredictions, setIo };
