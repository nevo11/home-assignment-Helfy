const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool;

async function init() {
    const host = process.env.TIDB_HOST || 'tidb';
    const port = parseInt(process.env.TIDB_PORT || '4000', 10);
    const user = process.env.TIDB_USER || 'root';
    const password = process.env.TIDB_PASSWORD || '';
    const database = process.env.TIDB_DATABASE || 'appdb';

    pool = mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
    });

    // Ensure tables exist
    await pool.query(
        `CREATE TABLE IF NOT EXISTS users (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255) UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
    );

    await pool.query(
        `CREATE TABLE IF NOT EXISTS tokens (
            id BIGINT PRIMARY KEY AUTO_INCREMENT,
            user_id BIGINT NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_token(token),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`,
    );
}

async function teardown() {
    if (pool) {
        await pool.end();
    }
}

// Auth
async function getUserByUsernameOrEmail(identifier) {
    const [rows] = await pool.query(
        'SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1',
        [identifier, identifier],
    );
    return rows[0] || null;
}

async function getUserById(userId) {
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
    return rows[0] || null;
}

async function createToken(userId, token, expiresAt) {
    await pool.query(
        'INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, token, expiresAt || null],
    );
    return token;
}

async function getToken(token) {
    const [rows] = await pool.query(
        'SELECT * FROM tokens WHERE token = ? LIMIT 1',
        [token],
    );
    return rows[0] || null;
}

async function revokeToken(token) {
    await pool.query('DELETE FROM tokens WHERE token = ?', [token]);
}

module.exports = {
    init,
    teardown,
    // auth
    getUserByUsernameOrEmail,
    getUserById,
    createToken,
    getToken,
    revokeToken,
}; 