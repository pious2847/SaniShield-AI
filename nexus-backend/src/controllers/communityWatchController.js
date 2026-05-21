const { uploadBuffer, isConfigured } = require('../services/cloudinaryService');
const { enrichLocation } = require('../services/geocodeService');
const { query } = require('../config/database');
const CommunityReport = require('../models/CommunityReport');
const IllegalDumpSite = require('../models/IllegalDumpSite');
const OdEvent = require('../models/OdEvent');
const RegisteredToilet = require('../models/RegisteredToilet');

let _io;
function setIo(io) { _io = io; }

async function saveWatchReport(routedTo, routedId, data, photoResult, location) {
  await query(
    `INSERT INTO society_watch_reports
      (report_type, description, severity, latitude, longitude, district, community,
       location_name, photo_url, cloudinary_id, reporter_name, reporter_phone,
       geocode_data, routed_to, routed_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      data.report_type, data.description||null, data.severity||'moderate',
      data.latitude||null, data.longitude||null,
      location.district, location.community||null, location.location_name||null,
      photoResult?.url||null, photoResult?.public_id||null,
      data.reporter_name||null, data.reporter_phone||null,
      location.geocode_data ? JSON.stringify(location.geocode_data) : null,
      routedTo, routedId||null,
    ]
  );
}

async function report(req, res, next) {
  try {
    const body = req.body;
    const { report_type, description, severity, reporter_name, reporter_phone } = body;
    const lat = parseFloat(body.latitude) || null;
    const lon = parseFloat(body.longitude) || null;

    if (!report_type) {
      return res.status(400).json({ success: false, message: 'report_type is required' });
    }

    // Upload photo to Cloudinary if provided
    let photoResult = null;
    if (req.file) {
      if (isConfigured()) {
        try {
          const folder = `nexus/community-watch/${report_type}`;
          photoResult = await uploadBuffer(req.file.buffer, { folder });
        } catch (err) {
          console.error('[CommunityWatch] Cloudinary upload error:', err.message);
          // Continue without photo rather than failing the whole report
        }
      } else {
        console.log('[CommunityWatch] Cloudinary not configured — photo not stored');
      }
    }

    // Enrich location from GPS
    const location = await enrichLocation(lat, lon, body.district, body.community);

    const photoUrl = photoResult?.url || body.photo_url || null;
    let result = null;
    let routedTo = null;

    // Route to the appropriate model
    if (report_type === 'illegal_dump') {
      result = await IllegalDumpSite.create({
        district: location.district, community: location.community,
        latitude: lat, longitude: lon,
        severity: severity||'moderate',
        description, reporter_name, reporter_phone,
        photo_url: photoUrl, status: 'open',
        waste_types: body.waste_types ? [body.waste_types] : [],
      });
      routedTo = 'illegal_dump_site';
      if (_io) _io.to(`district:${location.district}`).emit('new_dump_report', { district: location.district, severity });

    } else if (report_type === 'od_event') {
      result = await OdEvent.create({
        district: location.district, community: location.community,
        latitude: lat, longitude: lon,
        near_school: body.near_school === 'true' || body.near_school === true,
        school_name: body.school_name||null,
        distance_to_school_m: body.distance_to_school_m ? parseInt(body.distance_to_school_m) : null,
        reporter_name, reporter_phone,
        description, severity: severity||'moderate', photo_url: photoUrl,
      });
      routedTo = 'od_event';

    } else if (report_type === 'toilet_registration') {
      result = await RegisteredToilet.create({
        owner_name: reporter_name || 'Anonymous',
        owner_phone: reporter_phone||null,
        toilet_type: body.toilet_type || 'unknown',
        ownership_type: body.ownership_type || 'household',
        location_name: location.location_name || body.location_name,
        district: location.district, community: location.community,
        latitude: lat, longitude: lon,
        condition: body.condition || 'unknown',
        num_users: body.num_users ? parseInt(body.num_users) : null,
        has_water: body.has_water === 'true' || body.has_water === true,
        has_handwashing: body.has_handwashing === 'true' || body.has_handwashing === true,
        photo_url: photoUrl,
      });
      routedTo = 'registered_toilet';

    } else {
      // Default: sanitation_issue, flood_risk, or any other type → CommunityReport
      result = await CommunityReport.create({
        report_type: report_type,
        description, severity: severity||'moderate',
        reporter_name, reporter_phone,
        latitude: lat, longitude: lon,
        location_name: location.location_name,
        photo_url: photoUrl,
      });
      routedTo = 'community_report';
      if (_io) _io.to(`district:${location.district}`).emit('new_community_report', {
        report_type, district: location.district, severity,
      });
    }

    // Always save the raw watch report for audit trail
    await saveWatchReport(routedTo, result?.id, body, photoResult, location).catch(() => {});

    res.status(201).json({
      success: true,
      message: 'Report received — thank you for helping keep Northern Ghana clean!',
      data: {
        id: result?.id,
        routed_to: routedTo,
        district: location.district,
        community: location.community,
        photo_uploaded: !!photoResult,
        photo_url: photoUrl,
      },
    });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { district, report_type, limit } = req.query;
    const conds=[]; const params=[];
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    if (report_type) { conds.push(`report_type=$${params.length+1}`); params.push(report_type); }
    params.push(limit ? parseInt(limit) : 50);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM society_watch_reports ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params
    );
    res.json({ success: true, count: rows.length, data: rows });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const { rows } = await query('SELECT * FROM society_watch_reports WHERE id=$1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    if (!isConfigured()) {
      return res.status(503).json({ success: false, message: 'Photo uploads not configured. Set Cloudinary credentials in .env' });
    }
    const folder = req.body.folder || 'nexus/uploads';
    const result = await uploadBuffer(req.file.buffer, { folder });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

module.exports = { report, list, getOne, uploadPhoto, setIo };
