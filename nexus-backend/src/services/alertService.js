const Alert = require('../models/Alert');

const THRESHOLDS = {
  fill_critical: 90,
  fill_danger: 75,
  fill_warning: 60,
  water_level_danger: 30,
  water_level_warning: 15,
  gas_danger: 50,
  gas_warning: 25,
};

function buildSensorAlerts(unit, reading) {
  const alerts = [];

  if (reading.fill_level_percent >= THRESHOLDS.fill_critical) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'overflow_imminent',
      severity: 'critical',
      title: `CRITICAL: ${unit.name} About to Overflow`,
      message: `${unit.name} in ${unit.location_name} has reached ${reading.fill_level_percent}% capacity. Immediate emptying required.${unit.is_school ? ` This affects ${unit.school_name}.` : ''}`,
    });
  } else if (reading.fill_level_percent >= THRESHOLDS.fill_danger) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'overflow_imminent',
      severity: 'danger',
      title: `High Fill Level: ${unit.name}`,
      message: `${unit.name} is at ${reading.fill_level_percent}% capacity. Schedule emptying within 12 hours.`,
    });
  } else if (reading.fill_level_percent >= THRESHOLDS.fill_warning) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'maintenance_due',
      severity: 'warning',
      title: `Fill Level Warning: ${unit.name}`,
      message: `${unit.name} is at ${reading.fill_level_percent}% capacity. Plan maintenance within 48 hours.`,
    });
  }

  if (reading.water_level_cm >= THRESHOLDS.water_level_danger) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'flood_risk',
      severity: 'critical',
      title: `Flood Intrusion: ${unit.name}`,
      message: `Water level around ${unit.name} is ${reading.water_level_cm}cm. Flood intrusion is imminent.`,
    });
  } else if (reading.water_level_cm >= THRESHOLDS.water_level_warning) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'flood_risk',
      severity: 'danger',
      title: `Rising Water: ${unit.name}`,
      message: `Water level at ${unit.name} is rising (${reading.water_level_cm}cm). Monitor closely.`,
    });
  }

  if (reading.gas_ppm >= THRESHOLDS.gas_danger) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'gas_hazard',
      severity: 'critical',
      title: `GAS HAZARD: ${unit.name}`,
      message: `Dangerous gas level at ${unit.name}: ${reading.gas_ppm}ppm. Do not enter. Ventilate immediately.${unit.is_school ? ` EVACUATE ${unit.school_name}.` : ''}`,
    });
  } else if (reading.gas_ppm >= THRESHOLDS.gas_warning) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'gas_hazard',
      severity: 'warning',
      title: `Gas Warning: ${unit.name}`,
      message: `Elevated gas level at ${unit.name}: ${reading.gas_ppm}ppm. Increase ventilation.`,
    });
  }

  if (reading.battery_percent <= 10) {
    alerts.push({
      unit_id: unit.id,
      alert_type: 'system_offline',
      severity: 'warning',
      title: `Low Battery: ${unit.name} Sensor`,
      message: `Sensor at ${unit.name} has ${reading.battery_percent}% battery. Replace or recharge solar unit.`,
    });
  }

  return alerts;
}

function buildAlertFromPrediction(unit, prediction, aiResult) {
  if (!aiResult || !['high', 'critical'].includes(aiResult.risk_level)) return null;
  const alertTypes = {
    overflow: 'overflow_imminent',
    flood_risk: 'flood_risk',
    maintenance: 'maintenance_due',
    contamination: 'contamination_risk',
  };
  return {
    unit_id: unit.id,
    prediction_id: prediction?.id || null,
    alert_type: alertTypes[prediction?.prediction_type] || 'flood_risk',
    severity: aiResult.risk_level === 'critical' ? 'critical' : 'danger',
    title: `AI Alert: ${unit.name} — ${aiResult.risk_level.toUpperCase()} Risk`,
    message: aiResult.reasoning || `AI detected ${aiResult.risk_level} risk at ${unit.name}.`,
  };
}

async function persistSensorAlerts(unit, reading, io) {
  const candidates = buildSensorAlerts(unit, reading);
  const created = [];

  for (const alertData of candidates) {
    const existing = await Alert.activeForUnit(unit.id);
    const duplicate = existing.find(a => a.alert_type === alertData.alert_type && a.severity === alertData.severity);
    if (duplicate) continue;

    const alert = await Alert.create(alertData);
    created.push(alert);

    if (io) {
      io.emit('new_alert', {
        alert,
        unit_id: unit.id,
        unit_name: unit.name,
        district: unit.district,
      });
    }
  }

  return created;
}

module.exports = { buildSensorAlerts, buildAlertFromPrediction, persistSensorAlerts, THRESHOLDS };
