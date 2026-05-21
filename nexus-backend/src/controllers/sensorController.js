const SensorReading = require('../models/SensorReading');
const SanitationUnit = require('../models/SanitationUnit');
const { persistSensorAlerts } = require('../services/alertService');

let _io;
function setIo(io) { _io = io; }

async function ingestReading(req, res, next) {
  try {
    const unit = await SanitationUnit.findById(req.params.unitId);
    if (!unit) return res.status(404).json({ success: false, message: 'Sanitation unit not found' });

    const reading = await SensorReading.create({ unit_id: unit.id, ...req.body });

    if (reading.fill_level_percent >= 90 || reading.water_level_cm >= 30 || reading.gas_ppm >= 50) {
      await SanitationUnit.update(unit.id, { status: 'critical' });
    }

    const newAlerts = await persistSensorAlerts(unit, reading, _io);

    if (_io) {
      _io.emit('sensor_update', {
        unit_id: unit.id,
        unit_name: unit.name,
        district: unit.district,
        location_name: unit.location_name,
        latitude: unit.latitude,
        longitude: unit.longitude,
        is_school: unit.is_school,
        reading,
        alerts_triggered: newAlerts.length,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Sensor data recorded',
      data: { reading, alerts_triggered: newAlerts.length },
    });
  } catch (err) {
    next(err);
  }
}

async function batchIngest(req, res, next) {
  try {
    const readings = req.body.readings;
    if (!Array.isArray(readings)) {
      return res.status(400).json({ success: false, message: 'readings must be an array' });
    }
    const results = [];
    for (const r of readings) {
      const unit = await SanitationUnit.findById(r.unit_id);
      if (!unit) continue;
      const reading = await SensorReading.create({ ...r });
      await persistSensorAlerts(unit, reading, _io);
      if (_io) {
        _io.emit('sensor_update', { unit_id: unit.id, unit_name: unit.name, district: unit.district, reading });
      }
      results.push({ unit_id: r.unit_id, reading_id: reading.id });
    }
    res.status(201).json({ success: true, message: `Processed ${results.length} readings`, data: results });
  } catch (err) {
    next(err);
  }
}

async function getLatestAll(req, res, next) {
  try {
    const readings = await SensorReading.latestAllUnits();
    res.json({ success: true, data: readings, count: readings.length });
  } catch (err) {
    next(err);
  }
}

async function getReadingsForUnit(req, res, next) {
  try {
    const { unitId } = req.params;
    const hours = parseInt(req.query.hours) || 24;
    const [history, trend] = await Promise.all([
      SensorReading.historyForUnit(unitId, hours),
      SensorReading.fillRateTrend(unitId, Math.min(hours, 6)),
    ]);
    res.json({ success: true, data: { history, trend, unit_id: unitId } });
  } catch (err) {
    next(err);
  }
}

async function getCritical(req, res, next) {
  try {
    const readings = await SensorReading.criticalReadings();
    res.json({ success: true, data: readings, count: readings.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { ingestReading, batchIngest, getLatestAll, getReadingsForUnit, getCritical, setIo };
