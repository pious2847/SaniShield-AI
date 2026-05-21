const Ngo = require('../models/Ngo');

async function create(req, res, next) {
  try {
    const data = await Ngo.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { district, org_type, ai_contactable, limit } = req.query;
    const data = await Ngo.findAll({
      district: district || undefined,
      org_type: org_type || undefined,
      ai_contactable: ai_contactable !== undefined ? ai_contactable === 'true' : undefined,
      limit: limit ? parseInt(limit) : 100,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await Ngo.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'NGO not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const { query } = require('../config/database');
    const allowed = ['name','acronym','org_type','focus_areas','service_districts','description',
      'contact_person','contact_phone','contact_email','website','address','district',
      'latitude','longitude','ai_contactable','is_active'];
    const fields = []; const params = [];
    for (const k of allowed) {
      if (req.body[k] !== undefined) { fields.push(`${k}=$${params.length+1}`); params.push(req.body[k]); }
    }
    if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    fields.push('updated_at=NOW()');
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE ngos SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`, params
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'NGO not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

async function addAgent(req, res, next) {
  try {
    const data = await Ngo.addAgent({ ...req.body, ngo_id: req.params.id });
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function listAgents(req, res, next) {
  try {
    const data = await Ngo.getAgents(req.params.id);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function alertable(req, res, next) {
  try {
    const data = await Ngo.findAiContactable();
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

module.exports = { create, list, getOne, update, addAgent, listAgents, alertable };
