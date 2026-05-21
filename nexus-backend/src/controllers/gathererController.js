const Gatherer = require('../models/Gatherer');

let _io;
function setIo(io) { _io = io; }

async function register(req, res, next) {
  try {
    const data = await Gatherer.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { district, is_available, is_active, limit } = req.query;
    const data = await Gatherer.findAll({
      district: district || undefined,
      is_available: is_available !== undefined ? is_available === 'true' : undefined,
      is_active: is_active !== undefined ? is_active === 'true' : true,
      limit: limit ? parseInt(limit) : 100,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await Gatherer.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Gatherer not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function updateLocation(req, res, next) {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude and longitude required' });
    }
    const data = await Gatherer.updateLocation(req.params.id, latitude, longitude);
    if (!data) return res.status(404).json({ success: false, message: 'Gatherer not found' });
    if (_io) {
      _io.emit('gatherer_location', { gatherer_id: data.id, district: data.district, latitude, longitude });
    }
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function nearby(req, res, next) {
  try {
    const { lat, lon, radius } = req.query;
    if (!lat || !lon) return res.status(400).json({ success: false, message: 'lat and lon required' });
    const data = await Gatherer.findNearby(parseFloat(lat), parseFloat(lon), radius ? parseFloat(radius) : 10);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { query } = require('../config/database');
    const allowed = ['full_name','phone','alt_phone','district','service_communities','vehicle_type',
      'is_active','is_available','waste_types','bio_certified','ngo_id','rating'];
    const fields = []; const params = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { fields.push(`${k}=$${params.length+1}`); params.push(req.body[k]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push('updated_at=NOW()');
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE gatherers SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`, params
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Gatherer not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

module.exports = { register, list, getOne, updateLocation, nearby, update, setIo };
