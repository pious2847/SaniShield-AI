const Alert = require('../models/Alert');

async function listAlerts(req, res, next) {
  try {
    const { status, severity, district, limit } = req.query;
    const alerts = await Alert.findAll({ status, severity, district, limit: parseInt(limit) || 50 });
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (err) {
    next(err);
  }
}

async function getAlert(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
}

async function acknowledgeAlert(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    const updated = await Alert.acknowledge(req.params.id, req.user.id);
    res.json({ success: true, message: 'Alert acknowledged', data: updated });
  } catch (err) {
    next(err);
  }
}

async function resolveAlert(req, res, next) {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    const updated = await Alert.resolve(req.params.id);
    res.json({ success: true, message: 'Alert resolved', data: updated });
  } catch (err) {
    next(err);
  }
}

async function getAlertSummary(req, res, next) {
  try {
    const [activeCounts, byDistrict] = await Promise.all([
      Alert.countActive(),
      Alert.recentByDistrict(24),
    ]);
    const totals = activeCounts.reduce((acc, row) => {
      acc[row.severity] = parseInt(row.count);
      acc.total = (acc.total || 0) + parseInt(row.count);
      return acc;
    }, {});
    res.json({ success: true, data: { active_by_severity: totals, by_district_24h: byDistrict } });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAlerts, getAlert, acknowledgeAlert, resolveAlert, getAlertSummary };
