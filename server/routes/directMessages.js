const router = require('express').Router();
const DirectMessage = require('../models/DirectMessage');
const protect = require('../middleware/auth');


router.get('/:userId', protect, async (req, res) => {
    try {
        const messages = await DirectMessage.find({
            $or: [
                {sender: req.user._id, receiver: req.params.userId},
                {sender: req.params.userId, receiver: req.user._id},
            ],
        })
            .sort({createdAt: 1})
            .limit(100)
            .populate('sender', 'username')
            .populate('receiver', 'username');

        res.json(messages);
    }   catch (err) {
        res.status(500).json({ error : err.message });
    }
});

module.exports = router;