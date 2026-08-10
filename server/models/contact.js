const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
        type: String,
        enum: ['pending', 'accepted'],
        default: 'pending',
    }
}, { timestamps: true });

// Garantit qu'une demande unique existe entre deux utilisateurs
contactSchema.index({requester:1, recipient:1}, {unique: true});

module.exports = mongoose.model('Contact', contactSchema);