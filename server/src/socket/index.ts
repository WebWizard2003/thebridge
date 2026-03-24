import { Server } from "socket.io";
import { socketAuth } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { registerMessageHandlers } from "./handlers/message.handler.js";
import { registerTypingHandlers } from "./handlers/typing.handler.js";
import { setUserOnline, setUserOffline } from "./handlers/presence.handler.js";

export const connectedUsers = new Map<string, string>();

export function setupSocket(io: Server) {
  io.use(socketAuth);

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;

    connectedUsers.set(userId, socket.id);

    await setUserOnline(userId);

    // Join all conversation rooms
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    for (const m of memberships) {
      socket.join(m.conversationId);
    }

    // Broadcast online status to all conversation rooms
    for (const m of memberships) {
      socket.to(m.conversationId).emit("user:online", { userId });
    }

    registerMessageHandlers(socket, io);
    registerTypingHandlers(socket);

    // Allow joining new conversation rooms after creation
    socket.on("conversation:join", (data: { conversationId: string }) => {
      socket.join(data.conversationId);
    });

    socket.on("disconnect", async () => {
      connectedUsers.delete(userId);
      await setUserOffline(userId);

      for (const m of memberships) {
        socket.to(m.conversationId).emit("user:offline", { userId });
      }
    });
  });
}
