import { useEffect, useRef, useState } from "react";
import socket from "../socket";
import { getDMHistory, updateMessage, deleteMessage, uploadFile } from "../api";

/**
 * Composant de panneau de messagerie directe.
 * Gère l'affichage, l'envoi, la modification, la suppression et l'état de saisie.
 */
function DMPanel({ currentUser, currentUserId, targetUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  // ID du message en cours d'édition (null si aucun)
  const [editingMessageId, setEditingMessageId] = useState(null);

  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // 1. Chargement de l'historique
    getDMHistory(targetUser._id).then((history) => {
      if (!history.error) {
        setMessages(
          history.map((msg) => ({
            _id: msg._id,
            content: msg.content,
            edited: msg.edited,
            fileUrl: msg.fileUrl,
            fileType: msg.fileType,
            sender: msg.sender.username,
            senderId: msg.sender._id,
            createdAt: msg.createdAt,
          })),
        );
      }
    });

    // 2. Écouteurs Socket pour le temps réel
    const handleReceiveMessage = (data) => {
      // Filtrage des messages pour ne montrer que ceux de la conversation active
      const isFromTarget = data.senderId.toString() === targetUser._id.toString();
      const isToMe = data.receiverId?.toString() === currentUserId.toString();
      const isFromMe = data.senderId.toString() === currentUserId.toString();
      const isToTarget = data.receiverId?.toString() === targetUser._id.toString();

      if ((isFromTarget && isToMe) || (isFromMe && isToTarget)) {
        setMessages((prev) => [...prev, data]);
      }
    };

    socket.on("message:receive", handleReceiveMessage);

    // Mise à jour locale lors d'une modification reçue via socket
    const handleUpdateMessage = (data) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId 
            ? { ...msg, content: data.content, edited: data.edited } 
            : msg,
        ),
      );
    };

    // Suppression locale lors d'une suppression reçue via socket
    const handleDeleteMessage = (data) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== data.messageId));
    };

    socket.on("message:update", handleUpdateMessage);
    socket.on("message:delete", handleDeleteMessage);

    // Nettoyage lors du démontage du composant
    return () => {
      socket.off("message:receive", handleReceiveMessage);
      socket.off("message:update", handleUpdateMessage);
      socket.off("message:delete", handleDeleteMessage);
    };
  }, [targetUser._id, currentUserId]);

  // Auto-scroll en bas de la liste de messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    socket.emit("message:send", {
      receiverId: targetUser._id,
      content: input,
    });
    setInput("");
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    const data = await uploadFile(file);

    if (data.error) {
      console.error(data.error);
      return;
    }

    socket.emit("message:send", {
      receiverId: targetUser._id,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
    });
  };

  const handleSendOrUpdate = () => {
    if (editingMessageId) {
      handleEditSubmit(editingMessageId);
    } else {
      sendMessage();
    }
  };

  // Gestion des indicateurs de saisie
  const handleKeyDown = (e) => {
    socket.emit("typing:start", {
      receiverId: targetUser._id,
    });

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    
    typingTimeout.current = setTimeout(() => {
      socket.emit("typing:stop", {
        receiverId: targetUser._id,
      });
    }, 2000);

    if (e.key === "Enter") {
      handleSendOrUpdate();
    }
  };

  useEffect(() => {
    const handleTypingStart = () => setIsTyping(true);
    const handleTypingStop = () => setIsTyping(false);

    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket]);

  // Logique d'édition
  const handleEditingStart = (msg) => {
    setEditingMessageId(msg._id);
    setInput(msg.content);
  };

  const handleEditSubmit = async (msgId) => {
    if (!input.trim()) return;

    const data = await updateMessage(msgId, input);

    if (!data.error) {
      // Notifie l'autre utilisateur de la mise à jour
      socket.emit("message:update", {
        messageId: msgId,
        content: input,
      });

      // Met à jour localement
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === msgId 
            ? { ...msg, content: input } 
            : msg,
        ),
      );

      setEditingMessageId(null);
      setInput("");
    }
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setInput("");
  };

  const handleDelete = async (msgId) => {
    const data = await deleteMessage(msgId);

    if (!data.error) {
      // Notifie l'autre utilisateur de la suppression
      socket.emit("message:delete", {
        messageId: msgId,
      });

      // Met à jour localement
      setMessages((prev) => prev.filter((msg) => msg._id !== msgId));
    }
  };

  /**
   * Vérifie si un message peut encore être modifié ou supprimé (limite de 15 minutes).
   */
  const canModify = (createdAt) => {
    const EDIT_TIME_LIMIT = 15 * 60 * 1000;
    return Date.now() - new Date(createdAt).getTime() < EDIT_TIME_LIMIT;
  };

  return (
    <div className="dm-chat-container">
      <div className="dm-chat-header">
        <div className="dm-chat-header-info">
          <span className="dm-user-avatar">
            {targetUser.username[0].toUpperCase()}
          </span>
          <div>
            <h3>@{targetUser.username}</h3>
          </div>
        </div>
        <button className="dm-close-btn" onClick={onClose}>
          ✕ Fermer
        </button>
      </div>

      <div className="dm-messages-box">
        {messages.map((msg) => {
          const isMe = msg.sender === currentUser;
          const isCurrentlyEditing = editingMessageId === msg._id;
          return (
            <div
              key={msg._id}
              className={`message-item ${isMe ? "me" : "others"} ${isCurrentlyEditing ? "is-editing" : ""}`}
            >
              {!isMe && <span className="message-sender">{msg.sender}</span>}

              {msg.fileUrl ? (
                msg.fileType?.startsWith("image/") ? (
                  <img
                    src={`http://localhost:5001${msg.fileUrl}`}
                    alt="Image envoyée"
                    className="message-image"
                  />
                ) : (
                  <a
                    href={`http://localhost:5001${msg.fileUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 Ouvrir le fichier
                  </a>
                )
              ) : (
                <div className="message-content">
                  {msg.content}
                  {msg.edited && <span className="edited-label">(modifié)</span>}
                </div>
              )}
              {isMe && (
                <div className="message-action">
                  {canModify(msg.createdAt) && (
                    <button onClick={() => handleEditingStart(msg)}>
                      Modifier
                    </button>
                  )}
                  <button onClick={() => handleDelete(msg._id)}>
                    Supprimer
                  </button>
                </div>
              )}
              <span className="message-time">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {isTyping && (
        <div className="typing-indicator">
          {targetUser.username} écrit
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      {editingMessageId && (
        <div className="edit-preview-bar">
          <div className="edit-preview-content">
            <small>Modifier le message</small>
            <p>
              {messages.find((msg) => msg._id === editingMessageId)?.content}
            </p>
          </div>

          <button onClick={cancelEditing}>✕</button>
        </div>
      )}
      <div className="dm-input-area">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];

            if (file) {
              setSelectedFile(file);
              handleFileUpload(file);
            }
          }}
        />

        <button onClick={() => fileInputRef.current?.click()}>📎</button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Écrire à @${targetUser.username}...`}
        />

        <button onClick={handleSendOrUpdate}>
          {editingMessageId ? "Valider" : "Envoyer"}
        </button>
      </div>
    </div>
  );
}

export default DMPanel;
