const router = require('express').Router();
const Message = require('../models/message');

router.get('/:room', async (req, res) => {
    try {
        const messages = await Message.find({ room: req.params.room })
          .sort({ createdAt: 1 })   // trie les messages selon leur date de creation du plus ancien au plus récent
          .limit(50)    // on veut les 50 derniers messages 
          .populate('sender', 'username');

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error : err.message });
    }
});

module.exports = router;