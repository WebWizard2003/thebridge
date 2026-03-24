import { Socket, Server } from "socket.io";
import { prisma } from "../../lib/prisma.js";
import { connectedUsers } from "../index.js";

export function registerMessageHandlers(socket: Socket, io: Server) {
  const userId = socket.data.userId as string;

  socket.on("message:send", async (data: {
    conversationId: string;
    content?: string;
    type?: "TEXT" | "IMAGE" | "DOCUMENT";
    mediaUrl?: string;
  }) => {
    try {
      const { conversationId, content, type = "TEXT", mediaUrl } = data;

      const member = await prisma.conversationMember.findUnique({
        where: {
          conversationId_userId: { conversationId, userId },
        },
      });
      if (!member) return;

      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) return;
      if (conversation.isLocked && member.role !== "ADMIN") return;

      const otherMembers = await prisma.conversationMember.findMany({
        where: { conversationId, userId: { not: userId } },
        select: { userId: true },
      });

      const message = await prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content,
          type,
          mediaUrl,
          statuses: {
            create: otherMembers.map((m) => ({
              userId: m.userId,
              status: "SENT",
            })),
          },
        },
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
          statuses: true,
        },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      // Ensure sender is in the room (for newly created conversations)
      if (!socket.rooms.has(conversationId)) {
        socket.join(conversationId);
      }
      socket.to(conversationId).emit("message:received", message);
      socket.emit("message:sent", message);
    } catch (err) {
      console.error("message:send error", err);
    }
  });

  socket.on("message:delivered", async (data: { messageId: string }) => {
    try {
      const { messageId } = data;

      const status = await prisma.messageStatus.update({
        where: { messageId_userId: { messageId, userId } },
        data: { status: "DELIVERED" },
        include: { message: { select: { senderId: true } } },
      });

      const senderSocketId = connectedUsers.get(status.message.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message:status", {
          messageId,
          userId,
          status: "DELIVERED",
        });
      }
    } catch (err) {
      console.error("message:delivered error", err);
    }
  });

  socket.on("message:read", async (data: {
    messageId: string;
    conversationId: string;
  }) => {
    try {
      const { conversationId } = data;

      // Get all unread messages in this conversation for this user
      const unreadStatuses = await prisma.messageStatus.findMany({
        where: {
          userId,
          status: { not: "READ" },
          message: { conversationId, senderId: { not: userId } },
        },
        include: { message: { select: { id: true, senderId: true } } },
      });

      if (unreadStatuses.length === 0) return;

      await prisma.messageStatus.updateMany({
        where: {
          userId,
          status: { not: "READ" },
          message: { conversationId, senderId: { not: userId } },
        },
        data: { status: "READ" },
      });

      // Notify senders
      const senderUpdates = new Map<string, string[]>();
      for (const s of unreadStatuses) {
        const senderId = s.message.senderId;
        if (!senderUpdates.has(senderId)) {
          senderUpdates.set(senderId, []);
        }
        senderUpdates.get(senderId)!.push(s.message.id);
      }

      for (const [senderId, messageIds] of senderUpdates) {
        const senderSocketId = connectedUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit("message:status", {
            conversationId,
            userId,
            messageIds,
            status: "READ",
          });
        }
      }
    } catch (err) {
      console.error("message:read error", err);
    }
  });
}
