const { query } = require('../config/database');
const { randomUUID: uuidv4 } = require('crypto');

class WeatherHistory {
  static async save(data) {
    const { rows } = await query(
      `INSERT INTO weather_history
        (district, latitude, longitude, temperature_c, precipitation_mm, humidity_pct,
         windspeed_kmh, max_precip_rate_mm, total_precip_24h, hourly_precip, raw_api_data,
         season, recorded_at, source, cron_run)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        data.district, data.latitude, data.longitude,
        data.temperature_c||null, data.precipitation_mm||0,
        data.humidity_pct||null, data.windspeed_kmh||null,
        data.max_precip_rate_mm||null, data.total_precip_24h||null,
        data.hourly_precip ? JSON.stringify(data.hourly_precip) : null,
        data.raw_api_data ? JSON.stringify(data.raw_api_data) : null,
        data.season||null, data.recorded_at||new Date().toISOString(),
        data.source||'open_meteo', data.cron_run||false,
      ]
    );
    return rows[0];
  }

  static async getForDistrict(district, { from, to, limit=168 } = {}) {
    const conds=[`district=$1`]; const params=[district];
    if (from) { conds.push(`recorded_at>=$${params.length+1}`); params.push(from); }
    if (to) { conds.push(`recorded_at<=$${params.length+1}`); params.push(to); }
    params.push(limit);
    const { rows } = await query(
      `SELECT * FROM weather_history WHERE ${conds.join(' AND ')} ORDER BY recorded_at DESC LIMIT $${params.length}`,
      params
    );
    return rows;
  }

  static async getSummary(district, days=7) {
    const { rows } = await query(
      `SELECT
        AVG(temperature_c) AS avg_temp,
        SUM(precipitation_mm) AS total_precip,
        MAX(precipitation_mm) AS max_daily_precip,
        AVG(humidity_pct) AS avg_humidity,
        COUNT(*) AS record_count,
        MIN(recorded_at) AS from_date,
        MAX(recorded_at) AS to_date
       FROM weather_history
       WHERE district=$1 AND recorded_at >= NOW() - ($2||' days')::INTERVAL`,
      [district, days]
    );
    return rows[0];
  }

  static async heavyRainEvents(district, thresholdMm=20, days=30) {
    const { rows } = await query(
      `SELECT * FROM weather_history
       WHERE district=$1 AND precipitation_mm>=$2
         AND recorded_at>=NOW()-($3||' days')::INTERVAL
       ORDER BY recorded_at DESC`,
      [district, thresholdMm, days]
    );
    return rows;
  }

  static async latestPerDistrict() {
    const { rows } = await query(`
      SELECT DISTINCT ON (district) * FROM weather_history ORDER BY district, recorded_at DESC
    `);
    return rows;
  }
}

module.exports = WeatherHistory;
