import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const directSchema = z.object({
  userId: z.string(),
});

export default async function conversationRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware);

  fastify.get("/conversations", async (request) => {
    const userId = request.userId;

    const conversations = await prisma.conversation.findMany({
      where: {
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await prisma.messageStatus.count({
          where: {
            userId,
            status: { not: "READ" },
            message: { conversationId: conv.id, senderId: { not: userId } },
          },
        });

        return {
          ...conv,
          lastMessage: conv.messages[0] || null,
          messages: undefined,
          unreadCount,
        };
      })
    );

    return result;
  });

  fastify.post("/conversations/direct", async (request, reply) => {
    try {
      const body = directSchema.parse(request.body);
      const userId = request.userId;

      if (body.userId === userId) {
        return reply
          .status(400)
          .send({ error: "Cannot create conversation with yourself" });
      }

      // Check for existing direct conversation
      const existing = await prisma.conversation.findFirst({
        where: {
          type: "DIRECT",
          AND: [
            { members: { some: { userId } } },
            { members: { some: { userId: body.userId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

      if (existing) {
        return existing;
      }

      const conversation = await prisma.conversation.create({
        data: {
          type: "DIRECT",
          createdById: userId,
          members: {
            create: [
              { userId, role: "MEMBER" },
              { userId: body.userId, role: "MEMBER" },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });

      return reply.status(201).send(conversation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });

  fastify.get("/conversations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.userId;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return reply.status(404).send({ error: "Conversation not found" });
    }

    return conversation;
  });

  fastify.get("/conversations/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { cursor, limit } = request.query as {
      cursor?: string;
      limit?: string;
    };
    const userId = request.userId;
    const take = Math.min(parseInt(limit || "50", 10), 100);

    // Verify membership
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId } },
    });
    if (!member) {
      return reply.status(403).send({ error: "Not a member" });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : {}),
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        statuses: true,
      },
    });

    const hasMore = messages.length > take;
    const result = hasMore ? messages.slice(0, take) : messages;
    const nextCursor = hasMore ? result[result.length - 1].id : null;

    return { messages: result, nextCursor };
  });
}
