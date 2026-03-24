import { prisma } from "../../lib/prisma.js";

export async function setUserOnline(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: true, lastSeen: new Date() },
  });
}

export async function setUserOffline(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: false, lastSeen: new Date() },
  });
}
