import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.storyView.deleteMany();
  await prisma.story.deleteMany();
  await prisma.messageStatus.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash("password123", 10);

  // --- Users ---
  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      passwordHash: hash,
      name: "Alice Johnson",
      bio: "Hey there! I'm using RealTimeChat",
      isOnline: true,
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      passwordHash: hash,
      name: "Bob Smith",
      bio: "Full-stack dev & coffee lover",
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: "charlie@example.com",
      passwordHash: hash,
      name: "Charlie Brown",
      bio: "Design enthusiast",
    },
  });

  const diana = await prisma.user.create({
    data: {
      email: "diana@example.com",
      passwordHash: hash,
      name: "Diana Prince",
      bio: "Product manager by day, gamer by night",
    },
  });

  const eve = await prisma.user.create({
    data: {
      email: "eve@example.com",
      passwordHash: hash,
      name: "Eve Wilson",
      bio: "Data science nerd",
    },
  });

  // --- Direct Conversations ---
  const dmAliceBob = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: alice.id,
      members: {
        createMany: {
          data: [
            { userId: alice.id, role: "MEMBER" },
            { userId: bob.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  const dmAliceCharlie = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: alice.id,
      members: {
        createMany: {
          data: [
            { userId: alice.id, role: "MEMBER" },
            { userId: charlie.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  const dmBobDiana = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: bob.id,
      members: {
        createMany: {
          data: [
            { userId: bob.id, role: "MEMBER" },
            { userId: diana.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  // --- Group Conversations ---
  const devGroup = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: "Dev Team",
      createdById: alice.id,
      members: {
        createMany: {
          data: [
            { userId: alice.id, role: "ADMIN" },
            { userId: bob.id, role: "MEMBER" },
            { userId: charlie.id, role: "MEMBER" },
            { userId: diana.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  const announcementGroup = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: "Announcements",
      isLocked: true,
      createdById: diana.id,
      members: {
        createMany: {
          data: [
            { userId: diana.id, role: "ADMIN" },
            { userId: alice.id, role: "MEMBER" },
            { userId: bob.id, role: "MEMBER" },
            { userId: charlie.id, role: "MEMBER" },
            { userId: eve.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  const hangoutGroup = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: "Weekend Hangout",
      createdById: charlie.id,
      members: {
        createMany: {
          data: [
            { userId: charlie.id, role: "ADMIN" },
            { userId: alice.id, role: "MEMBER" },
            { userId: eve.id, role: "MEMBER" },
          ],
        },
      },
    },
  });

  // --- Messages (Alice <-> Bob DM) ---
  const now = Date.now();
  const min = 60_000;

  const aliceBobMessages = [
    { senderId: alice.id, content: "Hey Bob! How's the API coming along?", offset: -120 },
    { senderId: bob.id, content: "Pretty good! Just finished the auth endpoints", offset: -118 },
    { senderId: alice.id, content: "Nice! Did you add rate limiting?", offset: -115 },
    { senderId: bob.id, content: "Not yet, that's next on my list", offset: -113 },
    { senderId: alice.id, content: "Cool, let me know if you need help with Redis setup", offset: -110 },
    { senderId: bob.id, content: "Will do! BTW the socket layer is working great", offset: -60 },
    { senderId: alice.id, content: "Awesome, I just tested the typing indicators", offset: -58 },
    { senderId: bob.id, content: "Yeah those are smooth. Charlie did a great job on the UI", offset: -55 },
    { senderId: alice.id, content: "Agreed. Let's sync up tomorrow morning?", offset: -30 },
    { senderId: bob.id, content: "Sounds good, 10am works for me", offset: -28 },
    { senderId: alice.id, content: "Perfect, see you then!", offset: -25 },
  ];

  for (const msg of aliceBobMessages) {
    const message = await prisma.message.create({
      data: {
        conversationId: dmAliceBob.id,
        senderId: msg.senderId,
        content: msg.content,
        type: "TEXT",
        createdAt: new Date(now + msg.offset * min),
      },
    });
    const recipientId = msg.senderId === alice.id ? bob.id : alice.id;
    await prisma.messageStatus.createMany({
      data: [
        { messageId: message.id, userId: recipientId, status: "READ" },
      ],
    });
  }

  // --- Messages (Alice <-> Charlie DM) ---
  const aliceCharlieMessages = [
    { senderId: charlie.id, content: "Alice, I pushed the new design for the chat bubbles", offset: -90 },
    { senderId: alice.id, content: "Just saw it, looks really clean!", offset: -88 },
    { senderId: charlie.id, content: "Thanks! I went with the blue gradient for sent messages", offset: -85 },
    { senderId: alice.id, content: "Love it. Can you also update the story viewer?", offset: -80 },
    { senderId: charlie.id, content: "Already on it, should be done by EOD", offset: -78 },
  ];

  for (const msg of aliceCharlieMessages) {
    const message = await prisma.message.create({
      data: {
        conversationId: dmAliceCharlie.id,
        senderId: msg.senderId,
        content: msg.content,
        type: "TEXT",
        createdAt: new Date(now + msg.offset * min),
      },
    });
    const recipientId = msg.senderId === alice.id ? charlie.id : alice.id;
    await prisma.messageStatus.createMany({
      data: [
        { messageId: message.id, userId: recipientId, status: "DELIVERED" },
      ],
    });
  }

  // --- Messages (Dev Team Group) ---
  const devGroupMessages = [
    { senderId: alice.id, content: "Team standup: what's everyone working on today?", offset: -200 },
    { senderId: bob.id, content: "Finishing up the WebSocket handlers", offset: -198 },
    { senderId: charlie.id, content: "UI polish on the conversation list", offset: -196 },
    { senderId: diana.id, content: "Writing user stories for the stories feature (meta, I know)", offset: -194 },
    { senderId: alice.id, content: "Lol Diana. Alright let's crush it today!", offset: -192 },
    { senderId: bob.id, content: "Quick question - should we use cursor or offset pagination for messages?", offset: -150 },
    { senderId: alice.id, content: "Cursor-based for sure. Better for real-time data", offset: -148 },
    { senderId: charlie.id, content: "Agreed, offset breaks when new messages come in", offset: -146 },
    { senderId: diana.id, content: "Reminder: demo is on Friday. Let's make sure the happy path works end to end", offset: -50 },
    { senderId: alice.id, content: "On it. I'll do a full integration test tonight", offset: -48 },
    { senderId: bob.id, content: "I'll make sure the deploy pipeline is green", offset: -45 },
  ];

  for (const msg of devGroupMessages) {
    const message = await prisma.message.create({
      data: {
        conversationId: devGroup.id,
        senderId: msg.senderId,
        content: msg.content,
        type: "TEXT",
        createdAt: new Date(now + msg.offset * min),
      },
    });
    // Create read status for all other group members
    const members = [alice.id, bob.id, charlie.id, diana.id].filter(
      (id) => id !== msg.senderId
    );
    await prisma.messageStatus.createMany({
      data: members.map((userId) => ({
        messageId: message.id,
        userId,
        status: "READ" as const,
      })),
    });
  }

  // --- Messages (Announcements - locked group) ---
  const announcementMessages = [
    { senderId: diana.id, content: "Welcome to the announcements channel! Only admins can post here.", offset: -500 },
    { senderId: diana.id, content: "Office will be closed next Monday for the holiday", offset: -300 },
    { senderId: diana.id, content: "New benefits package details have been emailed to everyone", offset: -100 },
  ];

  for (const msg of announcementMessages) {
    const message = await prisma.message.create({
      data: {
        conversationId: announcementGroup.id,
        senderId: msg.senderId,
        content: msg.content,
        type: "TEXT",
        createdAt: new Date(now + msg.offset * min),
      },
    });
    const members = [alice.id, bob.id, charlie.id, eve.id];
    await prisma.messageStatus.createMany({
      data: members.map((userId) => ({
        messageId: message.id,
        userId,
        status: "READ" as const,
      })),
    });
  }

  // --- Messages (Weekend Hangout) ---
  const hangoutMessages = [
    { senderId: charlie.id, content: "Anyone up for hiking this Saturday?", offset: -70 },
    { senderId: alice.id, content: "I'm in! Where are we going?", offset: -68 },
    { senderId: eve.id, content: "Count me in too!", offset: -65 },
    { senderId: charlie.id, content: "Thinking the coastal trail. 9am start?", offset: -63 },
    { senderId: alice.id, content: "Perfect, I'll bring snacks", offset: -60 },
    { senderId: eve.id, content: "I'll drive, my car fits everyone", offset: -58 },
  ];

  for (const msg of hangoutMessages) {
    const message = await prisma.message.create({
      data: {
        conversationId: hangoutGroup.id,
        senderId: msg.senderId,
        content: msg.content,
        type: "TEXT",
        createdAt: new Date(now + msg.offset * min),
      },
    });
    const members = [charlie.id, alice.id, eve.id].filter(
      (id) => id !== msg.senderId
    );
    await prisma.messageStatus.createMany({
      data: members.map((userId) => ({
        messageId: message.id,
        userId,
        status: "SENT" as const,
      })),
    });
  }

  // --- Bob <-> Diana DM ---
  const bobDianaMessages = [
    { senderId: bob.id, content: "Diana, the deploy script is ready for review", offset: -40 },
    { senderId: diana.id, content: "Great, I'll take a look after lunch", offset: -38 },
    { senderId: bob.id, content: "No rush, just wanted to keep you in the loop", offset: -36 },
  ];

  for (const msg of bobDianaMessages) {
    const message = await prisma.message.create({
      data: {
        conversationId: dmBobDiana.id,
        senderId: msg.senderId,
        content: msg.content,
        type: "TEXT",
        createdAt: new Date(now + msg.offset * min),
      },
    });
    const recipientId = msg.senderId === bob.id ? diana.id : bob.id;
    await prisma.messageStatus.createMany({
      data: [
        { messageId: message.id, userId: recipientId, status: "DELIVERED" },
      ],
    });
  }

  // --- Stories ---
  const in24h = new Date(now + 24 * 60 * min);

  await prisma.story.create({
    data: {
      userId: alice.id,
      type: "TEXT",
      content: "Shipping features like crazy today!",
      backgroundColor: "#2563EB",
      expiresAt: in24h,
      createdAt: new Date(now - 120 * min),
      views: {
        createMany: {
          data: [
            { viewerId: bob.id },
            { viewerId: charlie.id },
          ],
        },
      },
    },
  });

  await prisma.story.create({
    data: {
      userId: alice.id,
      type: "TEXT",
      content: "Coffee count: 4 and it's only 2pm",
      backgroundColor: "#059669",
      expiresAt: in24h,
      createdAt: new Date(now - 60 * min),
      views: {
        createMany: {
          data: [{ viewerId: bob.id }],
        },
      },
    },
  });

  await prisma.story.create({
    data: {
      userId: bob.id,
      type: "TEXT",
      content: "Just deployed v2.0 to production!",
      backgroundColor: "#6366F1",
      expiresAt: in24h,
      createdAt: new Date(now - 90 * min),
      views: {
        createMany: {
          data: [
            { viewerId: alice.id },
            { viewerId: diana.id },
          ],
        },
      },
    },
  });

  await prisma.story.create({
    data: {
      userId: charlie.id,
      type: "TEXT",
      content: "New design system is looking fresh",
      backgroundColor: "#E11D48",
      expiresAt: in24h,
      createdAt: new Date(now - 45 * min),
    },
  });

  await prisma.story.create({
    data: {
      userId: diana.id,
      type: "TEXT",
      content: "Sprint review went great! Team is on fire",
      backgroundColor: "#F97316",
      expiresAt: in24h,
      createdAt: new Date(now - 30 * min),
      views: {
        createMany: {
          data: [
            { viewerId: alice.id },
            { viewerId: bob.id },
            { viewerId: charlie.id },
            { viewerId: eve.id },
          ],
        },
      },
    },
  });

  await prisma.story.create({
    data: {
      userId: eve.id,
      type: "TEXT",
      content: "Found a crazy pattern in the user data",
      backgroundColor: "#8B5CF6",
      expiresAt: in24h,
      createdAt: new Date(now - 15 * min),
    },
  });

  console.log("Seed complete!");
  console.log("");
  console.log("Login credentials (all same password: password123):");
  console.log("  alice@example.com   - Alice Johnson");
  console.log("  bob@example.com     - Bob Smith");
  console.log("  charlie@example.com - Charlie Brown");
  console.log("  diana@example.com   - Diana Prince");
  console.log("  eve@example.com     - Eve Wilson");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
