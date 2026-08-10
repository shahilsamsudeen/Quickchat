const BASE_URL = `${import.meta.env.VITE_API_URL}/api`;

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
            'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({username}),
    });

    return res.json();
}

// 
export const getContacts = async () => {
    const res = await fetch(`${BASE_URL}/api/contacts`, {
        headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
    });

    return res.json();
}

// Bouton accepter
export const acceptContact = async (requesterId) => {
    const res = await fetch (`${BASE_URL}/api/contacts/accept`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ requesterId }),
        }); 
        return res.json();
};

export const rejectContact = async (contactId) => {
    const res = await fetch(`${BASE_URL}/api/contacts/${contactId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });

  return res.json();
};
