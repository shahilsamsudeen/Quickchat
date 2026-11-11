const mongoose = require('mongoose');

const directMessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        trim: true,
    },
    fileUrl: {
        type: String,
    },
    fileType: {
        type: String,
    },
    edited: {
        type: Boolean,
        default: false,
    },
},
    { timestamps: true }
);

// // Index composé pour retrouver rapidement une conversation entre deux users
directMessageSchema.index({ sender:1, receiver:1 });

module.exports = mongoose.model('DirectMessage', directMessageSchema);