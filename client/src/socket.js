import { io } from 'socket.io-client';

const socket = io('https://quickchat-server-1sgt.onrender.com', {
  autoConnect: false,
  withCredentials: true,
  auth: (cb) => {
    cb ({token: localStorage.getItem('token')});
  },
});

export default socket;