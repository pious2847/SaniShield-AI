const CommunityReport = require('../models/CommunityReport');
const SanitationUnit = require('../models/SanitationUnit');
const gemini = require('../services/geminiService');

let _io;
function setIo(io) { _io = io; }

async function createReport(req, res, next) {
  try {
    const report = await CommunityReport.create({
      ...req.body,
      reported_by: req.user?.id || null,
    });

    const unitContext = report.unit_id ? await SanitationUnit.findById(report.unit_id) : null;

    // AI analysis runs async — don't block the response
    gemini.analyzeCommunityReport(report, unitContext)
      .then(analysis => {
        CommunityReport.updateAiAnalysis(report.id, analysis);
        if (_io) _io.emit('report_analyzed', { report_id: report.id, analysis });
      })
      .catch(err => console.error('[AI Report Analysis]', err.message));

    if (_io) {
      _io.emit('new_community_report', {
        report_id: report.id,
        report_type: report.report_type,
        severity: report.severity,
        location: unitContext?.location_name || 'Unknown',
        district: unitContext?.district,
      });
    }

    res.status(201).json({ success: true, message: 'Report submitted successfully', data: report });
  } catch (err) {
    next(err);
  }
}

async function listReports(req, res, next) {
  try {
    const reports = await CommunityReport.findAll(req.query);
    res.json({ success: true, data: reports, count: reports.length });
  } catch (err) {
    next(err);
  }
}

async function getReport(req, res, next) {
  try {
    const report = await CommunityReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (err) {
    next(err);
  }
}

async function updateReportStatus(req, res, next) {
  try {
    const { status, assigned_to } = req.body;
    const report = await CommunityReport.findById(req.params.id);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    const updated = await CommunityReport.updateStatus(req.params.id, status, assigned_to || null);
    res.json({ success: true, message: 'Report status updated', data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReport, listReports, getReport, updateReportStatus, setIo };
