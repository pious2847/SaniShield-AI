const { query } = require('../config/database');

class Gatherer {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO gatherers
        (full_name, phone, alt_phone, district, service_communities, vehicle_type,
         waste_types, bio_certified, ngo_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        data.full_name, data.phone, data.alt_phone||null, data.district,
        data.service_communities||null, data.vehicle_type||'tricycle',
        data.waste_types||['general'], data.bio_certified||false, data.ngo_id||null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query(
      `SELECT g.*, n.name AS ngo_name FROM gatherers g LEFT JOIN ngos n ON g.ngo_id=n.id WHERE g.id=$1`, [id]
    );
    return rows[0]||null;
  }

  static async findAll({ district, is_active, is_available } = {}) {
    const conds=[]; const params=[];
    if (district) { conds.push(`g.district=$${params.length+1}`); params.push(district); }
    if (is_active!==undefined) { conds.push(`g.is_active=$${params.length+1}`); params.push(!!is_active); }
    if (is_available!==undefined) { conds.push(`g.is_available=$${params.length+1}`); params.push(!!is_available); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT g.*, n.name AS ngo_name FROM gatherers g LEFT JOIN ngos n ON g.ngo_id=n.id ${where} ORDER BY g.district, g.full_name`,
      params
    );
    return rows;
  }

  static async updateLocation(id, lat, lon) {
    const { rows } = await query(
      `UPDATE gatherers SET current_lat=$1, current_lon=$2, last_location_at=NOW(), updated_at=NOW() WHERE id=$3 RETURNING *`,
      [lat, lon, id]
    );
    return rows[0];
  }

  static async updateStatus(id, is_active, is_available) {
    const { rows } = await query(
      `UPDATE gatherers SET is_active=$1, is_available=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [is_active, is_available, id]
    );
    return rows[0];
  }

  static async findNearby(lat, lon, radiusKm = 10) {
    const { rows } = await query(
      `SELECT *, (6371 * acos(
          cos(radians($1)) * cos(radians(current_lat)) *
          cos(radians(current_lon) - radians($2)) +
          sin(radians($1)) * sin(radians(current_lat))
        )) AS distance_km
       FROM gatherers
       WHERE is_active=true AND is_available=true AND current_lat IS NOT NULL
       HAVING (6371 * acos(
          cos(radians($1)) * cos(radians(current_lat)) *
          cos(radians(current_lon) - radians($2)) +
          sin(radians($1)) * sin(radians(current_lat))
        )) <= $3
       ORDER BY distance_km LIMIT 10`,
      [lat, lon, radiusKm]
    );
    return rows;
  }
}

module.exports = Gatherer;
