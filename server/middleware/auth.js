const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error : 'Non authentifié. ' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            return res.status(401).json({error : 'Utilisateur introuvable. '});
        }

        next();
    }   catch (err) {
        res.status(401).json({error : 'Token invalide ou expiré.'});
    }
};

module.exports = protect;