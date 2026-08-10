import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_API_URL, {
  autoConnect: false,   // On connecte manuellement après login
  auth: (cb) => {
    cb ({token: localStorage.getItem('token')});
  },
});

export default socket;