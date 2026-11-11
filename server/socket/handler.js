const DirectMessage = require("../models/DirectMessage");
const User = require("../models/user");

/**
 * Configure les gestionnaires d'événements Socket.io.
 * Sépare la logique métier des sockets du serveur principal.
 */
const setupSocketHandlers = (
  io,
  pubClient,
  notifyFriendsOfStatusChange,
  getOnlineUsers,
) => {
  io.on("connection", async (socket) => {
    const { username, _id } = socket.user;
    console.log(`🔌 Connected: ${socket.id}`);

    // L'utilisateur rejoint sa "room" personnelle pour recevoir des notifs privées
    socket.join(_id.toString());
    await pubClient.sadd("users:online", _id.toString());

    // Envoi de la liste des amis en ligne au client à sa connexion
    socket.emit("users:online", await getOnlineUsers(_id));
    await notifyFriendsOfStatusChange(_id, "online");

    // Générateur de nom de room unique pour chaque conversation privée
    const getRoomId = (idA, idB) =>
      ["dm", [idA.toString(), idB.toString()].sort().join("_")].join(":");

    // Auto-join aux rooms des conversations existantes pour recevoir les messages en temps réel
    const interlocutors = await DirectMessage.find({
      $or: [{ sender: _id }, { receiver: _id }],
    }).select("sender receiver");

    const seen = new Set();
    for (const dm of interlocutors) {
      let otherId =
        dm.sender.toString() === _id.toString()
          ? dm.receiver.toString()
          : dm.sender.toString();
      if (!seen.has(otherId)) {
        seen.add(otherId);
        socket.join(getRoomId(_id, otherId));
      }
    }

    // Gestion de l'envoi d'un message
    socket.on("message:send", async (data) => {
      try {
        const receiver = await User.findById(data.receiverId);
        if (!receiver) return;

        const message = await DirectMessage.create({
          sender: _id,
          receiver: data.receiverId,
          content: data.content,
          fileUrl: data.fileUrl,
          fileType: data.fileType,
        });
        await message.populate("sender", "username");
        await message.populate("receiver", "username");

        const room = getRoomId(_id, data.receiverId);

        // Assure que les participants sont dans la room pour recevoir l'événement
        socket.join(room);
        io.to(data.receiverId.toString()).socketsJoin(room);

        // Diffusion du message à tous les membres de la room
        io.to(room).emit("message:receive", {
          _id: message._id,
          content: message.content,
          fileUrl: message.fileUrl,
          fileType: message.fileType,
          sender: message.sender.username,
          senderId: message.sender._id,
          receiver: message.receiver.username,
          receiverId: message.receiver._id,
          createdAt: message.createdAt,
        });
      } catch (err) {
        console.error("Error message:send :", err.message);
      }
    });

    // Mise à jour d'un message existant
    socket.on("message:update", async (data) => {
      try {
        const message = await DirectMessage.findById(data.messageId);
        // Vérification de sécurité : seul l'auteur peut modifier
        if (!message || message.sender.toString() !== _id.toString()) return;

        message.content = data.content;
        message.edited = true;
        await message.save();

        const room = getRoomId(_id, message.receiver);
        io.to(room).emit("message:update", {
          messageId: message._id,
          content: message.content,
          edited: message.edited,
        });
      } catch (err) {
        console.error("Error message:update : ", err.message);
      }
    });

    // Suppression d'un message
    socket.on("message:delete", async (data) => {
      try {
        const message = await DirectMessage.findById(data.messageId);
        // Vérification de sécurité : seul l'auteur peut supprimer
        if (!message || message.sender.toString() !== _id.toString()) return;

        const room = getRoomId(message.sender, message.receiver);
        await message.deleteOne();

        io.to(room).emit("message:delete", {
          messageId: data.messageId,
        });
      } catch (err) {
        console.error("Error message:delete :", err.message);
      }
    });

    // Indicateurs de saisie
    socket.on("typing:start", (data) => {
      socket
        .to(getRoomId(_id, data.receiverId))
        .emit("typing:start", { userId: _id });
    });

    socket.on("typing:stop", (data) => {
      socket
        .to(getRoomId(_id, data.receiverId))
        .emit("typing:stop", { userId: _id });
    });

    socket.on("disconnect", async () => {
      await pubClient.srem("users:online", _id.toString());
      await notifyFriendsOfStatusChange(_id, "offline");
      console.log(`Disconnected: ${username}`);
    });
  });
};

module.exports = setupSocketHandlers;
