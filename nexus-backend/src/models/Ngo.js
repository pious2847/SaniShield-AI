const { query } = require('../config/database');

class Ngo {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO ngos
        (name, acronym, org_type, focus_areas, service_districts, description,
         contact_person, contact_phone, contact_email, website, address, district,
         latitude, longitude, ai_contactable)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        data.name, data.acronym||null, data.org_type,
        data.focus_areas, data.service_districts,
        data.description||null, data.contact_person, data.contact_phone,
        data.contact_email||null, data.website||null, data.address||null,
        data.district||null, data.latitude||null, data.longitude||null,
        data.ai_contactable||false,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM ngos WHERE id=$1', [id]);
    return rows[0]||null;
  }

  static async findAll({ org_type, district, ai_contactable } = {}) {
    const conds=[]; const params=[];
    if (org_type) { conds.push(`org_type=$${params.length+1}`); params.push(org_type); }
    if (district) { conds.push(`$${params.length+1}=ANY(service_districts)`); params.push(district); }
    if (ai_contactable!==undefined) { conds.push(`ai_contactable=$${params.length+1}`); params.push(!!ai_contactable); }
    conds.push(`is_active=true`);
    const { rows } = await query(
      `SELECT * FROM ngos WHERE ${conds.join(' AND ')} ORDER BY name`, params
    );
    return rows;
  }

  static async findByDistrict(district) {
    const { rows } = await query(
      `SELECT * FROM ngos WHERE $1=ANY(service_districts) AND is_active=true ORDER BY name`,
      [district]
    );
    return rows;
  }

  static async findAiContactable(district = null) {
    if (district) {
      const { rows } = await query(
        `SELECT * FROM ngos WHERE ai_contactable=true AND is_active=true AND $1=ANY(service_districts)`,
        [district]
      );
      return rows;
    }
    const { rows } = await query(`SELECT * FROM ngos WHERE ai_contactable=true AND is_active=true`);
    return rows;
  }

  static async update(id, data) {
    const allowed = ['name','description','contact_person','contact_phone','contact_email','website','ai_contactable','is_active'];
    const fields = Object.keys(data).filter(k=>allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const set = fields.map((f,i)=>`${f}=$${i+1}`).join(', ');
    const { rows } = await query(
      `UPDATE ngos SET ${set}, updated_at=NOW() WHERE id=$${fields.length+1} RETURNING *`,
      [...fields.map(f=>data[f]), id]
    );
    return rows[0];
  }

  // Agents
  static async addAgent(ngoId, agentData) {
    const { rows } = await query(
      `INSERT INTO ngo_agents (ngo_id, full_name, phone, role, district, service_communities, receives_ai_alerts)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [ngoId, agentData.full_name, agentData.phone, agentData.role,
       agentData.district||null, agentData.service_communities||null,
       agentData.receives_ai_alerts !== false]
    );
    return rows[0];
  }

  static async getAgents(ngoId) {
    const { rows } = await query(
      `SELECT * FROM ngo_agents WHERE ngo_id=$1 AND is_active=true ORDER BY full_name`,
      [ngoId]
    );
    return rows;
  }

  static async getAlertableAgents(district) {
    const { rows } = await query(
      `SELECT na.*, n.name AS ngo_name, n.acronym
       FROM ngo_agents na
       JOIN ngos n ON na.ngo_id=n.id
       WHERE na.receives_ai_alerts=true AND na.is_active=true
         AND n.is_active=true AND (na.district=$1 OR $1=ANY(n.service_districts))`,
      [district]
    );
    return rows;
  }
}

module.exports = Ngo;
