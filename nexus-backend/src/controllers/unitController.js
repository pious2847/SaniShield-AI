const SanitationUnit = require('../models/SanitationUnit');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');
const Prediction = require('../models/Prediction');

async function createUnit(req, res, next) {
  try {
    const unit = await SanitationUnit.create(req.body);
    res.status(201).json({ success: true, message: 'Sanitation unit created', data: unit });
  } catch (err) {
    next(err);
  }
}

async function listUnits(req, res, next) {
  try {
    const units = await SanitationUnit.findAll(req.query);
    res.json({ success: true, data: units, count: units.length });
  } catch (err) {
    next(err);
  }
}

async function getUnit(req, res, next) {
  try {
    const unit = await SanitationUnit.findById(req.params.id);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

    const [latestReading, activeAlerts, latestPrediction] = await Promise.all([
      SensorReading.latestForUnit(unit.id),
      Alert.activeForUnit(unit.id),
      Prediction.latestForUnit(unit.id),
    ]);

    res.json({
      success: true,
      data: {
        ...unit,
        latest_reading: latestReading || null,
        active_alerts: activeAlerts,
        latest_prediction: Prediction.parse(latestPrediction),
      },
    });
  } catch (err) {
    next(err);
  }
}

async function updateUnit(req, res, next) {
  try {
    const unit = await SanitationUnit.findById(req.params.id);
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    const updated = await SanitationUnit.update(req.params.id, req.body);
    res.json({ success: true, message: 'Unit updated', data: updated });
  } catch (err) {
    next(err);
  }
}

async function getHighRisk(req, res, next) {
  try {
    const units = await SanitationUnit.findHighRisk();
    const enriched = await Promise.all(units.map(async u => ({
      ...u,
      latest_reading: await SensorReading.latestForUnit(u.id),
      active_alerts_count: (await Alert.activeForUnit(u.id)).length,
    })));
    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (err) {
    next(err);
  }
}

async function getStats(req, res, next) {
  try {
    const byDistrict = await SanitationUnit.countByDistrict();
    res.json({ success: true, data: byDistrict });
  } catch (err) {
    next(err);
  }
}

module.exports = { createUnit, listUnits, getUnit, updateUnit, getHighRisk, getStats };
