const { query } = require('../config/database');

class Prediction {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO predictions
        (unit_id, prediction_type, risk_level, risk_score, predicted_event_at,
         confidence_percent, ai_reasoning, recommendations, weather_data, sensor_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.unit_id, data.prediction_type, data.risk_level, data.risk_score,
        data.predicted_event_at || null, data.confidence_percent || null,
        data.ai_reasoning || null,
        data.recommendations ? JSON.stringify(data.recommendations) : null,
        data.weather_data ? JSON.stringify(data.weather_data) : null,
        data.sensor_snapshot ? JSON.stringify(data.sensor_snapshot) : null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM predictions WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async latestForUnit(unit_id, type = null) {
    const params = [unit_id];
    let typeClause = '';
    if (type) { typeClause = `AND prediction_type = $2`; params.push(type); }
    const { rows } = await query(
      `SELECT * FROM predictions WHERE unit_id = $1 AND is_active = true ${typeClause}
       ORDER BY created_at DESC LIMIT 1`, params
    );
    return rows[0] || null;
  }

  static async activeHighRisk() {
    const { rows } = await query(`
      SELECT p.*, su.name AS unit_name, su.district, su.location_name,
             su.is_school, su.school_name, su.latitude, su.longitude
      FROM predictions p
      JOIN sanitation_units su ON p.unit_id = su.id
      WHERE p.is_active = true AND p.risk_level IN ('high','critical')
      ORDER BY p.risk_score DESC
    `);
    return rows;
  }

  static async deactivateForUnit(unit_id, type) {
    await query(
      `UPDATE predictions SET is_active = false WHERE unit_id = $1 AND prediction_type = $2 AND is_active = true`,
      [unit_id, type]
    );
  }

  static parse(prediction) {
    if (!prediction) return null;
    return {
      ...prediction,
      recommendations: prediction.recommendations
        ? (typeof prediction.recommendations === 'string' ? JSON.parse(prediction.recommendations) : prediction.recommendations)
        : [],
      weather_data: prediction.weather_data
        ? (typeof prediction.weather_data === 'string' ? JSON.parse(prediction.weather_data) : prediction.weather_data)
        : null,
      sensor_snapshot: prediction.sensor_snapshot
        ? (typeof prediction.sensor_snapshot === 'string' ? JSON.parse(prediction.sensor_snapshot) : prediction.sensor_snapshot)
        : null,
    };
  }
}

module.exports = Prediction;
