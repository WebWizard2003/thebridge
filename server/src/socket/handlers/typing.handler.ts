import { Socket } from "socket.io";

export function registerTypingHandlers(socket: Socket) {
  const userId = socket.data.userId as string;

  socket.on("typing:start", (data: { conversationId: string }) => {
    socket.to(data.conversationId).emit("typing:start", {
      conversationId: data.conversationId,
      userId,
    });
  });

  socket.on("typing:stop", (data: { conversationId: string }) => {
    socket.to(data.conversationId).emit("typing:stop", {
      conversationId: data.conversationId,
      userId,
    });
  });
}
