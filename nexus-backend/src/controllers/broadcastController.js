const Broadcast = require('../models/Broadcast');
const broadcastService = require('../services/broadcastService');

let _io;
function setIo(io) { _io = io; }

async function create(req, res, next) {
  try {
    const { trigger_context, target_districts } = req.body;
    if (!trigger_context || !target_districts) {
      return res.status(400).json({ success: false, message: 'trigger_context and target_districts required' });
    }
    const result = await broadcastService.createAndSend(trigger_context, target_districts, _io);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { status, broadcast_type, limit } = req.query;
    const data = await Broadcast.findAll({
      status: status || undefined,
      broadcast_type: broadcast_type || undefined,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await Broadcast.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function getRecipients(req, res, next) {
  try {
    const data = await Broadcast.getRecipients(req.params.id);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function send(req, res, next) {
  try {
    const broadcast = await Broadcast.findById(req.params.id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    if (_io) {
      const districts = broadcast.target_districts || [];
      for (const d of districts) {
        _io.to(`district:${d}`).emit('broadcast', {
          id: broadcast.id, title: broadcast.title,
          message: broadcast.message, severity: broadcast.severity,
        });
      }
    }
    const updated = await Broadcast.updateStatus(broadcast.id, 'sent');
    res.json({ success: true, data: updated });
  } catch (e) { next(e); }
}

async function recent(req, res, next) {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours) : 24;
    const data = await Broadcast.recent(hours);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

module.exports = { create, list, getOne, getRecipients, send, recent, setIo };
