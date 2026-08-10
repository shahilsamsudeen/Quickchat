const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const signToken = (userId) => {
    return jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// Router
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ erreur: 'Ce pseudo est déjà pris. ' });
        }

        const user = await User.create({username, password});
        const token = signToken(user._id);

        res.status(201).json({token, username: user.username, id: user._id});
        }   catch (err) {
        res.status(500).json({error: err.message});
        }
        });

        // Login
        router.post('/login', async (req, res) => {
        try {
        const {username, password} = req.body;

        const user = await User.findOne({username});
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({error : 'Pseudo ou mot de passe incorrect.'});
        }

        const token = signToken(user._id);
        res.json({token, username: user.username, id: user._id});
    }   catch (err){
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;