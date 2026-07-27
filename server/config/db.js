const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Mongodb connecté !');
    } catch (err) {
        console.error('Erreur de connexion mongodb :', err.message);
        process.exit(1);
    }
};
module.exports = connectDB;