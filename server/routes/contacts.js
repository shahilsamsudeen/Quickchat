const express = require('express');
const router = express.Router();
const Contact = require('../models/contact');
const User = require('../models/user');
const protect = require('../middleware/auth');

router.post('/add', protect, async (req, res) => {
    try {
        const {username} = req.body;

        const user = await User.findOne({username});
        if (!user) {
            return res.status(401).json({ error: 'Utilisateur introuvable.' });
        }
        if (user.id.toString() === req.user._id.toString()) {
            return res.status(401).json({ error: "Pas possible de s'ajouter soi-même" });
        }

        // Vérifier si une relation existe déjà (A vers B ou B vers A)
        const existingContact = await Contact.findOne({
            $or: [
                { requester: req.user._id, recipient: user._id },
                { requester: user._id, recipient: req.user._id }
            ]
        });
        if (existingContact) {
            if (existingContact.status === 'accepted') {
                return res.status(400).json({ error: 'Vous êtes déjà amis.' });
            }
            if (existingContact.requester.toString() === req.user._id.toString()) {
                return res.status(400).json({ error: 'Demande déjà envoyée.' });
            } else {
                return res.status(400).json({ error: 'Cet utilisateur vous a déjà envoyé une demande.' });
            }
        }

        const contact = await Contact.create({
            requester: req.user._id,
            recipient: user._id,
            status: 'pending',
        });

        // Notifier le destinataire en temps réel
        req.app.get('io')
            .to(user._id.toString())
            .emit('contact:request', {
                _id: contact._id,
                requester: { _id: req.user._id, username: req.user.username },
                status: 'pending'
            });

        res.status(201).json({ message: 'Demande envoyée.', contact, });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/accept', protect, async (req, res) => {
    try {
        const { requesterId } = req.body;

        const contact = await Contact.findOne({
            requester: requesterId,
            recipient: req.user._id,
            status: 'pending',
        });

        if (!contact) {
            return res.status(404).json({ error: 'Demande introuvable.' });
        }

        // Marquer la demande comme acceptée
        contact.status = 'accepted';
        await contact.save();

        // Notifier le demandeur en temps réel
        req.app.get('io')
            .to(contact.requester.toString())
            .emit('contact:accepted', {
                contactId: contact._id
        });

        res.json({ message: 'Demande accepté.', contact, });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:contactId', protect, async (req, res) => {
    try {
        const contact = await Contact.findOne({
            _id: req.params.contactId,
            recipient: req.user._id,
            status: 'pending',
        });

        if (!contact) {
            return res.status(404).json({ error: 'Demande introuvable' });
        }
        await contact.deleteOne();

        res.json({message: 'demande refusé'});
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

router.get('/', protect, async (req, res) => {
    try {
        const contacts = await Contact.find({
            $or: [
                {requester: req.user._id},
                {recipient: req.user._id},
            ],
            status: {$in: ['pending', 'accepted']}
        })
        .populate('requester', 'username')
        .populate('recipient', 'username');

        res.json(contacts);
    } catch (err) {
        res.status(500).json({error: err.message});
    }
});

module.exports = router;