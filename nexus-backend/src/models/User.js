const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, email, password, role, phone, district }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, phone, district)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email, passwordHash, role, phone || null, district || null]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const { rows } = await query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true', [email]
    );
    return rows[0] || null;
  }

  static async findAll({ district, role } = {}) {
    const conditions = [];
    const params = [];
    if (district) { conditions.push(`district = $${params.length + 1}`); params.push(district); }
    if (role) { conditions.push(`role = $${params.length + 1}`); params.push(role); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT id, name, email, role, phone, district, is_active, created_at FROM users ${where}`,
      params
    );
    return rows;
  }

  static async verifyPassword(plaintext, hash) {
    return bcrypt.compare(plaintext, hash);
  }

  static safe(user) {
    if (!user) return null;
    const { password_hash, ...safe } = user;
    return safe;
  }

  static async toggleActive(id) {
    const { rows } = await query(
      'UPDATE users SET is_active = NOT is_active WHERE id=$1 RETURNING id, name, email, role, district, is_active, created_at',
      [id]
    );
    return rows[0] || null;
  }
}

module.exports = User;
