require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');
const connectDB = require('./config/db');
const User = require('./models/user');
const authRoute = require('./routes/auth');
const DirectMessage = require('./models/DirectMessage');
const directMessageRoute = require('./routes/directMessages');
const Contact = require('./models/contact');
const contactsRoute = require('./routes/contacts');


const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "https://quickchat-mauve.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Initialiser Redis une seule fois au démarrage
const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

pubClient.on('connect', () => console.log('Redis connecté'));
pubClient.on('error', (err) => console.error('Erreur Redis :', err.message));

io.adapter(createAdapter(pubClient, subClient));

app.use(cors({
  origin: "https://quickchat-mauve.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

connectDB();

app.get('/', (req, res) => res.send('API du chat 🚀'));
app.use('/api/auth', authRoute);
app.use('/api/dm', directMessageRoute);
app.use('/api/contacts', contactsRoute);
app.set('io', io);  // je stocke mon instance socket.io dans Express sous le nom io

// --- Middleware Socket.io : vérification JWT au handshake ---
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Non authentifié.'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) return next(new Error('Utilisateur introuvable.'));

        // On attache le uuser directment sur le socket
        socket.user = user;
        next();
    }   catch (err) {
        next(new Error('Token invalide'));
    }
});

// Fonction pour récupérer les amis en ligne d'un utilisateur
const getOnlineUsers = async (userId) => {
    // 1. Récupérer tous les IDs actuellement en ligne dans Redis
    const ids = await pubClient.smembers('users:online');
    if (!ids.length) return [];

    // 2. Filtrer pour ne garder que ceux qui sont amis avec l'utilisateur
    const contactIds = await getAcceptedContactIds(userId);
    const visibleIds = ids.filter((id) => contactIds.includes(id));

    if (!visibleIds.length) return [];

    // 3. Récupérer les détails des utilisateurs depuis MongoDB
    return User.find({_id: { $in: visibleIds }, }).select('_id username');
};

// Récupère les IDs de tous les contacts acceptés pour un utilisateur donné
const getAcceptedContactIds = async (userId) => {
    const contacts = await Contact.find({
        $or: [
            {requester: userId},
            {recipient: userId}
        ],
        status: 'accepted',
    });

    return contacts.map((contact) => {
        return contact.requester.toString() === userId.toString()
            ? contact.recipient.toString()
            : contact.requester.toString();
    });
}

// Fonction pour notifier uniquement les amis d'un changement de statut
const notifyFriendsOfStatusChange = async (userId, status) => {
    const friendIds = await getAcceptedContactIds(userId);
    // On émet à chaque ami dans sa room personnelle pour mettre à jour sa vue
    for (const friendId of friendIds) {
        io.to(friendId).emit('users:online', await getOnlineUsers(friendId));
    }
};

// --- Socket.io ---
io.on('connection', async (socket) => {
    const {username, _id} = socket.user;
    console.log(`🔌 Connecté : ${socket.id}`);

    // L'utilisateur rejoint une room qui porte son id pour recevoir des notifs personnelles
    socket.join(_id.toString());

    // Présence en ligne
    await pubClient.sadd('users:online', _id.toString());
    
    // 1. Envoyer la liste à l'utilisateur qui vient de se connecter
    socket.emit('users:online', await getOnlineUsers(_id));
    
    // 2. Notifier tous ses amis qu'il est en ligne
    await notifyFriendsOfStatusChange(_id, 'online');

    // --- Room privée ---
    // On construit le nom de la room
    const getRoomId = (idA, idB) => 
        ['dm', [idA.toString(), idB.toString()].sort().join('_')].join(':');
    
    // Le user rejoint automatiquement toutes ses conversations existantes
    const interlocutors = await DirectMessage.find({
        $or: [{sender: _id}, {receiver: _id}],
    }).select('sender receiver');

    const seen = new Set();
    for (const dm of interlocutors) {
        let otherId;
        if (dm.sender.toString() === _id.toString()) {
            otherId = dm.receiver.toString();
        } else {
            otherId = dm.sender.toString();
        }

        if (!seen.has(otherId)) {
            seen.add(otherId);
            socket.join(getRoomId(_id, otherId));
        }
    }

    // envoie d'un message privée 
    socket.on('dm:send', async (data) => {
        // data = { receiverId, content }
        try {
            const receiver = await User.findById(data.receiverId);
            if (!receiver) return ;

            const message = await DirectMessage.create({
                sender: _id,
                receiver: data.receiverId,
                content: data.content,
            });
            await message.populate('sender', 'username');
            await message.populate('receiver', 'username');

            const room = getRoomId(_id, data.receiverId);

            // On s'assure que les deux users sont dans la room
            socket.join(room);
            io.to(data.receiverId.toString()).socketsJoin(room);

            io.to(room).emit('dm:receive', {
                content: message.content,
                sender: message.sender.username,
                senderId: message.sender._id,
                receiver: message.receiver.username,
                receiverId: message.receiver._id,
                createdAt: message.createdAt,
            });
        } catch (err) {
            console.error('Erreur dm:send :', err.message);
        }
    });

    // Déconnexion
    socket.on('disconnect', async () => {
        await pubClient.srem('users:online', _id.toString());
        
        // Notifier tous ses amis qu'il est hors ligne
        await notifyFriendsOfStatusChange(_id, 'offline');
        
        console.log(`Déconnecté : ${username}`);
    });
});

const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
});