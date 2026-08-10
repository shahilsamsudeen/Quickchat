import { io } from 'socket.io-client';

const socket = io('http://localhost:5001', {
  autoConnect: false,   // On connecte manuellement après login
  auth: (cb) => {
    cb ({token: localStorage.getItem('token')});
  },
});

export default socket;