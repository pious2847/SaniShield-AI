const { query } = require('../config/database');

class SensorReading {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO sensor_readings
        (unit_id, fill_level_percent, water_level_cm, temperature_celsius,
         humidity_percent, gas_ppm, battery_percent, signal_strength, is_simulated, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.unit_id, data.fill_level_percent,
        data.water_level_cm ?? 0, data.temperature_celsius ?? null,
        data.humidity_percent ?? null, data.gas_ppm ?? 0,
        data.battery_percent ?? 100, data.signal_strength ?? null,
        data.is_simulated || false,
        data.recorded_at || new Date().toISOString(),
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM sensor_readings WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async latestForUnit(unit_id) {
    const { rows } = await query(
      `SELECT * FROM sensor_readings WHERE unit_id = $1 ORDER BY recorded_at DESC LIMIT 1`,
      [unit_id]
    );
    return rows[0] || null;
  }

  static async historyForUnit(unit_id, hours = 24) {
    const { rows } = await query(
      `SELECT * FROM sensor_readings
       WHERE unit_id = $1 AND recorded_at >= NOW() - ($2 || ' hours')::INTERVAL
       ORDER BY recorded_at ASC`,
      [unit_id, hours]
    );
    return rows;
  }

  static async fillRateTrend(unit_id, hours = 6) {
    const { rows } = await query(
      `SELECT fill_level_percent, recorded_at FROM sensor_readings
       WHERE unit_id = $1 AND recorded_at >= NOW() - ($2 || ' hours')::INTERVAL
       ORDER BY recorded_at ASC`,
      [unit_id, hours]
    );

    if (rows.length < 2) return { rate_per_hour: 0, readings: rows };
    const first = rows[0];
    const last = rows[rows.length - 1];
    const hoursDiff = (new Date(last.recorded_at) - new Date(first.recorded_at)) / 3600000;
    const rate = hoursDiff > 0
      ? (last.fill_level_percent - first.fill_level_percent) / hoursDiff
      : 0;
    return { rate_per_hour: Math.round(rate * 100) / 100, readings: rows };
  }

  static async latestAllUnits() {
    const { rows } = await query(`
      SELECT DISTINCT ON (sr.unit_id)
        sr.*, su.name AS unit_name, su.district, su.location_name,
        su.latitude, su.longitude, su.flood_zone_risk, su.is_school, su.status AS unit_status
      FROM sensor_readings sr
      JOIN sanitation_units su ON sr.unit_id = su.id
      ORDER BY sr.unit_id, sr.recorded_at DESC
    `);
    return rows;
  }

  static async criticalReadings() {
    const { rows } = await query(`
      SELECT DISTINCT ON (sr.unit_id)
        sr.*, su.name AS unit_name, su.district, su.location_name, su.is_school
      FROM sensor_readings sr
      JOIN sanitation_units su ON sr.unit_id = su.id
      WHERE sr.fill_level_percent >= 85 OR sr.water_level_cm >= 30 OR sr.gas_ppm >= 50
      ORDER BY sr.unit_id, sr.recorded_at DESC
    `);
    return rows;
  }
}

module.exports = SensorReading;
