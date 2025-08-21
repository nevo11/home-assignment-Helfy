const express = require('express');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const waitPort = require('wait-port');
const db = require('./persistence');
// removed items route imports
const { getLogger } = require('./logger');

const logger = getLogger('api');

app.use(helmet());
app.use(cors({ origin: '*', exposedHeaders: ['x-auth-token'] }));
app.use(express.json());
// no static app content needed for assignment

// Auth middleware
async function authMiddleware(req, res, next) {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ error: 'Missing token' });
    try {
        const tokenRow = await db.getToken(token);
        if (!tokenRow) return res.status(401).json({ error: 'Invalid token' });
        if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) return res.status(401).json({ error: 'Token expired' });
        req.userId = tokenRow.user_id;
        next();
    } catch (e) {
        res.status(500).json({ error: 'Auth error' });
    }
}

// Auth routes
app.post('/auth/login', async (req, res) => {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) return res.status(400).json({ error: 'identifier and password required' });
    try {
        const user = await db.getUserByUsernameOrEmail(identifier);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const ok = await bcrypt.compare(password, user.password_hash);
        if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

        const token = crypto.randomBytes(24).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 8); // 8 hours
        await db.createToken(user.id, token, expiresAt);

        // log login
        logger.info('user.login', {
            userId: user.id,
            action: 'login',
            ip: req.ip,
        });

        res.setHeader('x-auth-token', token);
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (e) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/auth/logout', authMiddleware, async (req, res) => {
    const token = req.header('x-auth-token');
    await db.revokeToken(token);
    res.json({ ok: true });
});

app.get('/auth/me', authMiddleware, async (req, res) => {
    const user = await db.getUserById(req.userId);
    res.json({ id: user.id, username: user.username, email: user.email });
});

const start = async () => {
    try {
        const host = process.env.TIDB_HOST || 'tidb';
        const port = parseInt(process.env.TIDB_PORT || '4000', 10);
        await waitPort({ host, port, timeout: 120000 });
        await db.init();
        app.listen(3000, () => console.log('Listening on port 3000'));
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();

const gracefulShutdown = () => {
    db.teardown()
        .catch(() => {})
        .then(() => process.exit());
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGUSR2', gracefulShutdown); // Sent by nodemon
