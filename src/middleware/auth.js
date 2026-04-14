const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(401).json({ success: false, message: 'Tidak diizinkan, token hilang' });
        }
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_123');
        req.admin = decoded;
        next();
    } catch (error) {
        res.clearCookie('token');
        if (req.xhr || req.headers.accept.includes('json')) {
            return res.status(401).json({ success: false, message: 'Tidak diizinkan, token tidak valid' });
        }
        return res.redirect('/login');
    }
};

module.exports = { protect };
