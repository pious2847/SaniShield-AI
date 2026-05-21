const SanitationUnit = require('../models/SanitationUnit');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const { predictOverflowRisk } = require('../services/geminiService');
const floodAssessmentService = require('../services/floodAssessmentService');
const broadcastService = require('../services/broadcastService');

let _io;
function setIo(io) { _io = io; }

async function sensorSpike(req, res, next) {
  try {
    const trace = [];

    // Pick a random active unit (prefer critical flood zones)
    const units = await SanitationUnit.findAll({ status: 'active', flood_zone_risk: 'high' });
    const pool = units.length ? units : await SanitationUnit.findAll({ status: 'active' });
    if (!pool.length) return res.status(404).json({ success: false, message: 'No active sanitation units found' });

    const unit = pool[Math.floor(Math.random() * Math.min(pool.length, 5))];
    trace.push({ step: 'unit_selected', unit_id: unit.id, name: unit.name, district: unit.district });

    // Inject critical sensor reading
    const reading = await SensorReading.create({
      unit_id: unit.id,
      fill_level_percent: 94,
      water_level_cm: 35,
      temperature_celsius: 34.5,
      humidity_percent: 88,
      gas_ppm: 55,
      battery_percent: 72,
    });
    trace.push({ step: 'sensor_reading_injected', reading_id: reading.id, fill_level: reading.fill_level_percent });

    // Run AI overflow prediction
    const fillTrend = { rate_per_hour: 3.2 };
    let prediction = null;
    try {
      prediction = await predictOverflowRisk(unit, reading, fillTrend);
    } catch { prediction = { risk_level: 'critical', risk_score: 94, predicted_overflow_hours: 2 }; }
    trace.push({ step: 'ai_prediction', risk_level: prediction.risk_level, risk_score: prediction.risk_score });

    // Create alert
    const alert = await Alert.create({
      unit_id: unit.id,
      district: unit.district,
      alert_type: 'overflow_risk',
      severity: prediction.risk_level,
      message: prediction.sms_message || `SIMULATOR: Critical overflow risk at ${unit.name} — ${prediction.risk_score}% risk`,
      prediction_data: prediction,
    });
    trace.push({ step: 'alert_created', alert_id: alert.id, severity: alert.severity });

    // Emit socket events
    if (_io) {
      _io.emit('sensor_update', { unit_id: unit.id, unit_name: unit.name, district: unit.district, reading, alerts_triggered: 1 });
      _io.to(`district:${unit.district}`).emit('new_alert', {
        unit_id: unit.id, district: unit.district,
        severity: prediction.risk_level, message: alert.message,
      });
    }
    trace.push({ step: 'socket_events_emitted' });

    res.json({ success: true, scenario: 'sensor_spike', trace });
  } catch (e) { next(e); }
}

async function floodEvent(req, res, next) {
  try {
    const district = req.body.district || 'Tamale Metro';
    const assessment = await floodAssessmentService.manualTrigger(district, _io);
    res.json({
      success: true,
      scenario: 'flood_event',
      data: assessment,
      message: assessment
        ? `Flood assessment triggered for ${district}`
        : `Active assessment already exists for ${district}`,
    });
  } catch (e) { next(e); }
}

async function fullDemo(req, res, next) {
  try {
    const eventLog = [];
    const district = req.body.district || 'Tamale Metro';

    // Step 1: Sensor spike
    let spikeResult = null;
    try {
      spikeResult = await new Promise((resolve, reject) => {
        const mockRes = { json: resolve, status: () => ({ json: resolve }) };
        sensorSpike({ body: {} }, mockRes, reject);
      });
      eventLog.push({ sequence: 1, event: 'sensor_spike', status: 'ok', trace: spikeResult?.trace });
    } catch (err) {
      eventLog.push({ sequence: 1, event: 'sensor_spike', status: 'error', error: err.message });
    }

    // Step 2: Flood assessment (250ms delay for realism)
    await new Promise(r => setTimeout(r, 250));
    let floodResult = null;
    try {
      const assessment = await floodAssessmentService.manualTrigger(district, _io);
      floodResult = assessment;
      eventLog.push({ sequence: 2, event: 'flood_assessment', status: 'ok', assessment_id: assessment?.id });
    } catch (err) {
      eventLog.push({ sequence: 2, event: 'flood_assessment', status: 'error', error: err.message });
    }

    // Step 3: AI broadcast (250ms delay)
    await new Promise(r => setTimeout(r, 250));
    try {
      const broadcast = await broadcastService.createAndSend(
        { event: 'demo_full_scenario', district, rainfall_mm: 32, sensor_alert: true },
        [district],
        _io
      );
      eventLog.push({ sequence: 3, event: 'ai_broadcast', status: 'ok', broadcast_id: broadcast?.id });
    } catch (err) {
      eventLog.push({ sequence: 3, event: 'ai_broadcast', status: 'error', error: err.message });
    }

    res.json({
      success: true,
      scenario: 'full_demo',
      district,
      event_log: eventLog,
      summary: `Executed ${eventLog.filter(e => e.status === 'ok').length}/3 demo steps successfully`,
    });
  } catch (e) { next(e); }
}

module.exports = { setIo, sensorSpike, floodEvent, fullDemo };
