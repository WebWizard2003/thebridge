import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function createSocket(token: string): Socket {
  if (socket) {
    socket.disconnect();
  }
  socket = io("http://localhost:3001", {
    auth: { token },
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
