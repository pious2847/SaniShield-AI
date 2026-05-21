const IllegalDumpSite = require('../models/IllegalDumpSite');
const { analyzeIllegalDump } = require('../services/geminiService');
const { query } = require('../config/database');

async function report(req, res, next) {
  try {
    const data = await IllegalDumpSite.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { district, status, severity, limit } = req.query;
    const data = await IllegalDumpSite.findAll({
      district: district || undefined,
      status: status || undefined,
      severity: severity || undefined,
      limit: limit ? parseInt(limit) : 100,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await IllegalDumpSite.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Dump site not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function resolve(req, res, next) {
  try {
    const { rows } = await query(
      `UPDATE illegal_dump_sites SET status='resolved', resolved_at=NOW(), updated_at=NOW()
       WHERE id=$1 RETURNING *`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Dump site not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

async function assign(req, res, next) {
  try {
    const { assigned_ngo_id, assigned_gatherer_id } = req.body;
    if (!assigned_ngo_id && !assigned_gatherer_id) {
      return res.status(400).json({ success: false, message: 'assigned_ngo_id or assigned_gatherer_id required' });
    }
    const fields = []; const params = [];
    if (assigned_ngo_id) { fields.push(`assigned_ngo_id=$${params.length+1}`); params.push(assigned_ngo_id); }
    if (assigned_gatherer_id) { fields.push(`assigned_gatherer_id=$${params.length+1}`); params.push(assigned_gatherer_id); }
    fields.push(`status='assigned'`, `updated_at=NOW()`);
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE illegal_dump_sites SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`, params
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Dump site not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

async function analyzeWithAi(req, res, next) {
  try {
    const dump = await IllegalDumpSite.findById(req.params.id);
    if (!dump) return res.status(404).json({ success: false, message: 'Dump site not found' });
    const analysis = await analyzeIllegalDump(dump, req.body.context || {});
    await query(
      `UPDATE illegal_dump_sites SET ai_analysis=$1, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(analysis), dump.id]
    );
    res.json({ success: true, data: { ...dump, ai_analysis: analysis } });
  } catch (e) { next(e); }
}

module.exports = { report, list, getOne, resolve, assign, analyzeWithAi };
