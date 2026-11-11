const BASE_URL = 'https://quickchat-server-1sgt.onrender.com/api';

export const register = async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({username, password}),
    });
    return res.json();
};

export const login = async (username, password) => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
};

// On récupère l'historique des messages privés avec un utilisateur.
export const getDMHistory = async (userId) => {
    const res = await fetch(`${BASE_URL}/dm/${userId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    });
    return res.json();
}

// On envoie un contact
export const addContact = async (username) => {
    const res = await fetch(`${BASE_URL}/contacts/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({username}),
    });

    return res.json();
}

// On récupère la liste des contacts
export const getContacts = async () => {
    const res = await fetch(`${BASE_URL}/contacts`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });

    return res.json();
}

// Bouton accepter
export const acceptContact = async (requesterId) => {
    const res = await fetch (`${BASE_URL}/contacts/accept`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ requesterId }),
        }); 
        return res.json();
};

// Bouton rejeter/supprimer
export const rejectContact = async (contactId) => {
    const res = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  return res.json();
};

// Mise à jour d'un message
export const updateMessage = async (msgId, newContent) => {
    const token = localStorage.getItem('token')

    const res = await fetch(`${BASE_URL}/dm/${msgId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({content: newContent}),
    });

    return res.json();
}

// Suppression d'un message
export const deleteMessage = async (msgId) => {
    const token = localStorage.getItem('token');

    const res = await fetch(`${BASE_URL}/dm/${msgId}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return res.json();
}

// Upload de fichier
export const uploadFile = async (file) => {
    const formData = new FormData();

    formData.append('file', file);

    const res = await fetch(`${BASE_URL}/dm/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: formData,
    })

    return res.json();
}
