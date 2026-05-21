const FloodAssessment = require('../models/FloodAssessment');
const floodAssessmentService = require('../services/floodAssessmentService');
const cloudinaryService = require('../services/cloudinaryService');

let _io;
function setIo(io) { _io = io; }

async function list(req, res, next) {
  try {
    const { district, status, limit } = req.query;
    const data = await FloodAssessment.findAll({
      district: district || undefined,
      status: status || undefined,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const assessment = await FloodAssessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ success: false, message: 'Assessment not found' });
    const checks = await FloodAssessment.getAssetChecks(req.params.id);
    res.json({ success: true, data: { ...assessment, asset_checks: checks } });
  } catch (e) { next(e); }
}

async function trigger(req, res, next) {
  try {
    const { district } = req.body;
    if (!district) return res.status(400).json({ success: false, message: 'district is required' });
    const assessment = await floodAssessmentService.manualTrigger(district, _io);
    if (!assessment) return res.status(409).json({ success: false, message: 'Active assessment already exists for this district' });
    res.status(201).json({ success: true, data: assessment });
  } catch (e) { next(e); }
}

async function getChecks(req, res, next) {
  try {
    const data = await FloodAssessment.getAssetChecks(req.params.id);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function updateCheck(req, res, next) {
  try {
    let photoUrl = null; let cloudinaryId = null;
    if (req.file) {
      const up = await cloudinaryService.uploadBuffer(req.file.buffer, { folder: 'nexus/flood_checks', resource_type: 'image' });
      photoUrl = up.url; cloudinaryId = up.public_id;
    }
    const updateData = {
      ...req.body,
      inspected_by: req.user.id,
      ...(photoUrl && { photo_url: photoUrl, cloudinary_id: cloudinaryId }),
    };
    const check = await FloodAssessment.updateAssetCheck(req.params.checkId, updateData);
    if (!check) return res.status(404).json({ success: false, message: 'Check not found' });

    // Refresh counts on parent assessment
    if (check.assessment_id) FloodAssessment.updateCounts(check.assessment_id).catch(() => {});

    res.json({ success: true, data: check });
  } catch (e) { next(e); }
}

async function complete(req, res, next) {
  try {
    const updated = await floodAssessmentService.markComplete(req.params.id);
    if (!updated) return res.status(404).json({ success: false, message: 'Assessment not found' });
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

module.exports = { setIo, list, getOne, trigger, getChecks, updateCheck, complete };
