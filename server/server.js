require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const User = require('./models/user');
const Message = require('./models/message');
const messagesRoute = require('./routes/messages');

const app = express();
const httpServer = http.createServer(app) // Express passe dans le serveur http

// Création serveur Socket.io
const io = new Server(httpServer, {     // utilise le serveur HTTP
    cors: {     // j'autorise uniquement mon application React
        origin: '*',     // L'URL de vite
        methods: ['GET', 'POST'],   
    },
});

app.use(cors());
app.use(express.json());

connectDB();

app.get('/', (req, res) => res.send('API du chat en temps réel'));
app.use('/api/messages', messagesRoute);


// --- Logique Socket.io ---
io.on('connection', async (socket) => {       // ici à chaque fois qu'un nv client se connecte, exécute cette fonction 
    console.log(`Client connecté : ${socket.id}`)     // chaque client reçoit un identifiant

    // 1. On envoie l'historique au client qui vient de se connecter
    try {
        const history = await Message.find({ room: 'general' })
          .sort({ createdAt: 1 })
          .limit(50)
          .populate('sender', 'username');
        
        socket.emit('message:history', history);
    } catch (err) {
        console.error('Erreur chargement historique :', err.message);
    }

    // 2. Identification du user 
    socket.on('user:join', async (username) => {
        try {
            const user = await User.findOneAndUpdate(
                { username },
                { username },
                { upsert: true, new: true }
            ); 

            // On stocke le user sur l'objet socket pour y accéder plus tard 
            socket.userId = user._id;
            socket.username = user.username;
            console.log(`User identifié ! : ${socket.username}`);
        } catch (err) {
            console.log('Erreur user: join :', err.message);
        }
        const history = await Message.find({ room: 'general' })
          .sort({ createdAt: 1 })
          .limit(50)
          .populate('sender', 'username');
        
        socket.emit('message:history', history);
    });


    // 3. Réception et persistance d'un message
    socket.on('message:send', async (data) => {
        if (!socket.userId) return;     // pas de message sans identité

        try {
            const message = await Message.create({
                sender: socket.userId,
                content: data.content,
                room: data.room || 'general',
            });

            // Populate pour avoir le username dans le broadcast
            await message.populate('sender', 'username');

            io.emit('message:receive', {
                _id: message._id,
                content: message.content,
                sender: message.sender.username,
                room: message.room,
                createdAt: message.createdAt,
            });
        } catch (err) {
            console.error('Erreur message:send :', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Déconnecté : ${socket.id}`);
    });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
});