import { io } from 'socket.io-client';

const URL = process.env.NODE_ENV === 'production' 
  ? 'https://chat-4iy0.onrender.com' 
  : 'http://localhost:10000';

const socket = io(URL);

export default socket;