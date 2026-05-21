const SludgeJob = require('../models/SludgeJob');
const Gatherer = require('../models/Gatherer');
const cloudinaryService = require('../services/cloudinaryService');

let _io;
function setIo(io) { _io = io; }

async function create(req, res, next) {
  try {
    const data = { ...req.body, created_by: req.user.id };

    // Auto-assign nearest available gatherer if not specified
    if (!data.gatherer_id && data.district) {
      const gatherers = await Gatherer.findAll({ district: data.district, is_available: true, limit: 1 });
      if (gatherers.length) data.gatherer_id = gatherers[0].id;
    }

    const job = await SludgeJob.create(data);
    if (_io) _io.to(`district:${job.district}`).emit('sludge_job_created', { job_id: job.id, status: job.status });
    res.status(201).json({ success: true, data: job });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { district, status, gatherer_id, facility_id, limit } = req.query;
    const data = await SludgeJob.findAll({
      district: district || undefined,
      status: status || undefined,
      gatherer_id: gatherer_id || undefined,
      facility_id: facility_id || undefined,
      limit: limit ? parseInt(limit) : 100,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await SludgeJob.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Sludge job not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function accept(req, res, next) {
  try {
    const job = await SludgeJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Sludge job not found' });
    if (!['pending','assigned'].includes(job.status)) {
      return res.status(400).json({ success: false, message: `Cannot accept job in status: ${job.status}` });
    }
    const updated = await SludgeJob.updateStatus(req.params.id, 'accepted');
    if (_io) _io.to(`district:${updated.district}`).emit('sludge_job_updated', { job_id: updated.id, status: 'accepted' });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

async function pickup(req, res, next) {
  try {
    let photoUrl = null; let cloudinaryId = null;
    if (req.file) {
      const up = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: 'nexus/sludge_jobs', resource_type: 'image' });
      photoUrl = up.url; cloudinaryId = up.public_id;
    }
    const extra = {
      volume_litres: req.body.volume_litres || null,
      pickup_lat: req.body.pickup_lat || null,
      pickup_lon: req.body.pickup_lon || null,
      pickup_at: new Date().toISOString(),
      pickup_photo_url: photoUrl,
      pickup_cloudinary_id: cloudinaryId,
      facility_id: req.body.facility_id || null,
    };
    const updated = await SludgeJob.updateStatus(req.params.id, 'in_transit', extra);
    if (!updated) return res.status(404).json({ success: false, message: 'Sludge job not found' });
    if (_io) _io.to(`district:${updated.district}`).emit('sludge_job_updated', { job_id: updated.id, status: 'in_transit' });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

async function deliver(req, res, next) {
  try {
    let photoUrl = null; let cloudinaryId = null;
    if (req.file) {
      const up = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: 'nexus/sludge_jobs', resource_type: 'image' });
      photoUrl = up.url; cloudinaryId = up.public_id;
    }
    const extra = {
      delivery_lat: req.body.delivery_lat || null,
      delivery_lon: req.body.delivery_lon || null,
      delivered_at: new Date().toISOString(),
      delivery_photo_url: photoUrl,
      delivery_cloudinary_id: cloudinaryId,
    };
    const updated = await SludgeJob.updateStatus(req.params.id, 'delivered', extra);
    if (!updated) return res.status(404).json({ success: false, message: 'Sludge job not found' });
    if (_io) _io.to(`district:${updated.district}`).emit('sludge_job_updated', { job_id: updated.id, status: 'delivered' });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

async function confirmTreatment(req, res, next) {
  try {
    const updated = await SludgeJob.confirmTreatment(req.params.id, req.body.notes);
    if (!updated) return res.status(404).json({ success: false, message: 'Sludge job not found' });
    if (_io) _io.to(`district:${updated.district}`).emit('sludge_job_updated', { job_id: updated.id, status: 'completed', chain_complete: true });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

async function cancel(req, res, next) {
  try {
    const updated = await SludgeJob.updateStatus(req.params.id, 'cancelled', { notes: req.body.reason || null });
    if (!updated) return res.status(404).json({ success: false, message: 'Sludge job not found' });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

async function chainStats(req, res, next) {
  try {
    const { district } = req.query;
    const data = await SludgeJob.chainStats(district || undefined);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

module.exports = { setIo, create, list, getOne, accept, pickup, deliver, confirmTreatment, cancel, chainStats };
