const RegisteredToilet = require('../models/RegisteredToilet');
const QRCode = require('qrcode');

async function register(req, res, next) {
  try {
    const toilet = await RegisteredToilet.create(req.body);
    res.status(201).json({ success: true, data: toilet });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { district, toilet_type, is_verified, limit } = req.query;
    const filters = {
      district: district || undefined,
      toilet_type: toilet_type || undefined,
      is_verified: is_verified !== undefined ? is_verified === 'true' : undefined,
      limit: limit ? parseInt(limit) : 100,
    };
    const data = await RegisteredToilet.findAll(filters);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await RegisteredToilet.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Toilet not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function verify(req, res, next) {
  try {
    const data = await RegisteredToilet.verify(req.params.id, req.user.id);
    if (!data) return res.status(404).json({ success: false, message: 'Toilet not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const { query } = require('../config/database');
    const { rows } = await query(
      'DELETE FROM registered_toilets WHERE id=$1 RETURNING id', [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Toilet not found' });
    res.json({ success: true, message: 'Toilet removed' });
  } catch (e) { next(e); }
}

async function countByDistrict(req, res, next) {
  try {
    const data = await RegisteredToilet.countByDistrict();
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function qrCode(req, res, next) {
  try {
    const toilet = await RegisteredToilet.findById(req.params.id);
    if (!toilet) return res.status(404).json({ success: false, message: 'Toilet not found' });
    const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/report?toilet_id=${toilet.id}`;
    const pngBuffer = await QRCode.toBuffer(url, { type: 'png', width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="toilet-qr-${toilet.id}.png"`);
    res.send(pngBuffer);
  } catch (e) { next(e); }
}

module.exports = { register, list, getOne, verify, remove, countByDistrict, qrCode };
