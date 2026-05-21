const WasteFacility = require('../models/WasteFacility');

async function create(req, res, next) {
  try {
    const data = await WasteFacility.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { district, facility_type, status, limit } = req.query;
    const data = await WasteFacility.findAll({
      district: district || undefined,
      facility_type: facility_type || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : 100,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await WasteFacility.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Facility not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { query } = require('../config/database');
    const allowed = ['name','facility_type','operator','district','community','latitude','longitude',
      'capacity_m3','current_load_pct','status','contact_name','contact_phone','operating_hours',
      'accepts_waste_types','notes'];
    const fields = []; const params = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { fields.push(`${k}=$${params.length+1}`); params.push(req.body[k]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push('updated_at=NOW()');
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE waste_facilities SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`, params
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Facility not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { query } = require('../config/database');
    const { rows } = await query('DELETE FROM waste_facilities WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Facility not found' });
    res.json({ success: true, message: 'Facility removed' });
  } catch (e) { next(e); }
}

module.exports = { create, list, getOne, update, remove };
