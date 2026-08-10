const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true, 
      trim: true,
    },
    password: {
      type: String, 
      required: true,
      minlength: 8,
      validate: {
        validator: function (v) {
          // Au moins une majuscule, une minuscule, un chiffre
          return /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(v);
        },
        message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.',
      },
    },
  },
  { timestamps: true }
);

// Hash automatique avant chaque sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Méthode pour comparer un mot de passe en clair avec le hash
userSchema.methods.comparePassword = async function (candidatePasword) {
  return bcrypt.compare(candidatePasword, this.password);
};

module.exports = mongoose.model('User', userSchema);

