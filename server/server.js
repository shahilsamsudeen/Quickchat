require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const User = require("./models/user");
const authRoute = require("./routes/auth");
const DirectMessage = require("./models/DirectMessage");
const directMessageRoute = require("./routes/directMessages");
const Contact = require("./models/contact");
const contactsRoute = require("./routes/contacts");
const setupSocketHandlers = require("./socket/handler");

// --- Initialisation Serveur ---
const app = express();
const httpServer = http.createServer(app);

// Autoriser le site déployé et le serveur Vite local.
const frontendOrigins = [
  "https://quickchat-mauve.vercel.app",
  "http://localhost:5173",
];
const corsOptions = {
  origin: frontendOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
};
const io = new Server(httpServer, { cors: corsOptions });

// Initialiser Redis une seule fois au démarrage
const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

pubClient.on("connect", () => console.log("Redis connecté"));
pubClient.on("error", (err) => console.error("Erreur Redis :", err.message));

io.adapter(createAdapter(pubClient, subClient));

// --- Middlewares & Routes ---
app.use(cors(corsOptions));
app.use(express.json());
app.use("/uploads", express.static("uploads"));

connectDB();

app.get("/", (req, res) => res.send("API du chat 🚀"));
app.use("/api/auth", authRoute);
app.use("/api/dm", directMessageRoute);
app.use("/api/contacts", contactsRoute);

// Stockage des instances dans l'app Express pour les utiliser dans les routes
app.set("io", io);

// --- Middleware Socket.io : Authentification JWT ---
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Non authentifié."));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new Error("Utilisateur introuvable."));

    socket.user = user; // Utilisateur authentifié attaché au socket
    next();
  } catch (err) {
    next(new Error("Token invalide"));
  }
});

// --- Fonctions utilitaires de présence (utilisées dans les handlers et les routes) ---

/**
 * Récupère la liste des utilisateurs en ligne qui sont amis avec l'utilisateur donné.
 */
const getOnlineUsers = async (userId) => {
  const ids = await pubClient.smembers("users:online");
  if (!ids.length) return [];

  const contactIds = await getAcceptedContactIds(userId);
  const visibleIds = ids.filter((id) => contactIds.includes(id));

  if (!visibleIds.length) return [];

  return User.find({ _id: { $in: visibleIds } }).select("_id username");
};

/**
 * Récupère les IDs de tous les contacts acceptés (amis) pour un utilisateur.
 */
const getAcceptedContactIds = async (userId) => {
  const contacts = await Contact.find({
    $or: [{ requester: userId }, { recipient: userId }],
    status: "accepted",
  });

  return contacts.map((contact) => {
    return contact.requester.toString() === userId.toString()
      ? contact.recipient.toString()
      : contact.requester.toString();
  });
};

/**
 * Notifie tous les amis connectés d'un utilisateur d'un changement de statut (online/offline).
 */
const notifyFriendsOfStatusChange = async (userId, status) => {
  const friendIds = await getAcceptedContactIds(userId);
  for (const friendId of friendIds) {
    io.to(friendId.toString()).emit("users:online", await getOnlineUsers(friendId));
  }
};

// Enregistrement des fonctions utilitaires dans l'app pour les rendre accessibles
app.set("notifyFriendsOfStatusChange", notifyFriendsOfStatusChange);
app.set("getOnlineUsers", getOnlineUsers);

// --- Lancement des gestionnaires Socket ---
setupSocketHandlers(io, pubClient, notifyFriendsOfStatusChange, getOnlineUsers);

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});
