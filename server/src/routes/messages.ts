import { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.js";

const createMessageSchema = z.object({
  content: z.string().optional(),
  type: z.enum(["TEXT", "IMAGE", "DOCUMENT"]).default("TEXT"),
  mediaUrl: z.string().optional(),
});

export default async function messageRoutes(fastify: FastifyInstance) {
  fastify.addHook("preHandler", authMiddleware);

  fastify.post("/conversations/:id/messages", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = createMessageSchema.parse(request.body);
      const userId = request.userId;

      // Verify membership
      const member = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId: id, userId } },
      });
      if (!member) {
        return reply.status(403).send({ error: "Not a member" });
      }

      // Check locked
      const conversation = await prisma.conversation.findUnique({
        where: { id },
      });
      if (!conversation) {
        return reply.status(404).send({ error: "Conversation not found" });
      }
      if (conversation.isLocked && member.role !== "ADMIN") {
        return reply
          .status(403)
          .send({ error: "Conversation is locked. Only admins can send messages." });
      }

      // Get other members for status creation
      const otherMembers = await prisma.conversationMember.findMany({
        where: { conversationId: id, userId: { not: userId } },
        select: { userId: true },
      });

      const message = await prisma.message.create({
        data: {
          conversationId: id,
          senderId: userId,
          content: body.content,
          type: body.type,
          mediaUrl: body.mediaUrl,
          statuses: {
            create: otherMembers.map((m) => ({
              userId: m.userId,
              status: "SENT",
            })),
          },
        },
        include: {
          sender: {
            select: { id: true, name: true, avatar: true },
          },
          statuses: true,
        },
      });

      // Update conversation updatedAt
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date() },
      });

      return reply.status(201).send(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return reply.status(400).send({ error: err.errors });
      }
      throw err;
    }
  });
}
