const router = require("express").Router();
const DirectMessage = require("../models/DirectMessage");
const protect = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// --- Configuration de Sécurité ---

// Limite de temps pour modifier/supprimer un message (15 minutes)
const EDIT_TIME_LIMIT = 15 * 60 * 1000;

// Configuration du stockage Multer avec renommage unique
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    // Génère un nom unique : timestamp-nombreAleatoire.extension
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5 Mo
  fileFilter: (req, file, cb) => {
    // Filtre les types de fichiers autorisés
    const allowedTypes = /jpeg|jpg|png|gif|mp4|pdf|zip/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error("Format de fichier non autorisé."));
    }
  },
});

/**
 * Route pour récupérer l'historique des messages d'une conversation.
 */
router.get("/:userId", protect, async (req, res) => {
  try {
    const messages = await DirectMessage.find({
      $or: [
        { sender: req.user._id, receiver: req.params.userId },
        { sender: req.params.userId, receiver: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate("sender", "username")
      .populate("receiver", "username");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route pour mettre à jour un message existant.
 */
router.put("/:messageId", protect, async (req, res) => {
  try {
    const message = await DirectMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    // Sécurité : seul l'auteur peut modifier
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized." });
    }

    // Sécurité : Vérification du délai de 15 minutes
    const timeElapsed = Date.now() - new Date(message.createdAt).getTime();
    if (timeElapsed > EDIT_TIME_LIMIT) {
      return res.status(403).json({
        error: "Le délai de modification (15 min) est dépassé.",
      });
    }

    message.content = req.body.content;
    message.edited = true;
    await message.save();

    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route pour supprimer un message.
 */
router.delete("/:messageId", protect, async (req, res) => {
  try {
    const message = await DirectMessage.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found." });
    }

    // Sécurité : seul l'auteur peut supprimer
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized." });
    }

    await message.deleteOne();

    res.json({ message: "Message deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Route pour uploader un fichier.
 */
router.post("/upload", protect, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file received." });
    }

    res.json({
      fileUrl: `/uploads/${req.file.filename}`,
      fileType: req.file.mimetype,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
