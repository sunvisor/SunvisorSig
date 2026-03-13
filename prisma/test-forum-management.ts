import { SystemRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function addForumMemberRecord(input: {
  forumId: string;
  userId: string;
  actingUserId: string;
}) {
  const { forumId, userId, actingUserId } = input;

  if (!forumId || !userId) {
    throw new Error("INVALID_INPUT");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.status !== "ACTIVE") {
    throw new Error("INVALID_USER");
  }

  await prisma.forumMember.upsert({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
    update: {
      role: "PARTICIPANT",
    },
    create: {
      forumId,
      userId,
      role: "PARTICIPANT",
    },
  });

  return actingUserId;
}

async function removeForumMemberRecord(input: {
  forumId: string;
  userId: string;
  actingUserId: string;
}) {
  const { forumId, userId, actingUserId } = input;

  const targetMembership = await prisma.forumMember.findUnique({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
  });

  if (!targetMembership) {
    throw new Error("INVALID_TARGET");
  }

  if (userId === actingUserId) {
    throw new Error("FORBIDDEN_SELF_REMOVE");
  }

  await prisma.forumMember.delete({
    where: {
      forumId_userId: {
        forumId,
        userId,
      },
    },
  });
}

async function createInvitationRecord(input: {
  forumId: string;
  email: string;
  actingUserId: string;
}) {
  const email = input.email.trim().toLowerCase();

  if (!input.forumId || !email) {
    throw new Error("INVALID_INPUT");
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error("USER_ALREADY_EXISTS");
  }

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      forumId: input.forumId,
      email,
      status: {
        in: ["PENDING", "ACCEPTED"],
      },
    },
  });

  if (existingInvitation) {
    throw new Error("INVITATION_ALREADY_EXISTS");
  }

  return prisma.invitation.create({
    data: {
      forumId: input.forumId,
      email,
      role: "PARTICIPANT",
      token: `token-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 60_000),
      createdByUserId: input.actingUserId,
    },
  });
}

async function cancelInvitationRecord(input: {
  forumId: string;
  invitationId: string;
}) {
  const invitation = await prisma.invitation.findUnique({
    where: { id: input.invitationId },
  });

  if (!invitation || invitation.forumId !== input.forumId) {
    throw new Error("INVITATION_NOT_FOUND");
  }

  if (invitation.status !== "PENDING") {
    throw new Error("INVITATION_NOT_PENDING");
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });
}

async function cleanup(ids: {
  forumId?: string;
  adminUserId?: string;
  memberUserId?: string;
  invitedUserId?: string;
  suspendedUserId?: string;
}) {
  if (ids.forumId) {
    await prisma.forum.delete({
      where: { id: ids.forumId },
    }).catch(() => {});
  }

  for (const userId of [
    ids.adminUserId,
    ids.memberUserId,
    ids.invitedUserId,
    ids.suspendedUserId,
  ]) {
    if (!userId) {
      continue;
    }

    await prisma.user.delete({
      where: { id: userId },
    }).catch(() => {});
  }
}

async function cleanupHistoricalData() {
  await prisma.forum.deleteMany({
    where: {
      name: {
        startsWith: "Forum Management Test ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "forum-management-admin-" } },
        { email: { startsWith: "forum-management-member-" } },
        { email: { startsWith: "forum-management-invited-" } },
        { email: { startsWith: "forum-management-suspended-" } },
      ],
    },
  });
}

async function main() {
  await cleanupHistoricalData();

  const suffix = Date.now().toString();
  const ids: {
    forumId?: string;
    adminUserId?: string;
    memberUserId?: string;
    invitedUserId?: string;
    suspendedUserId?: string;
  } = {};

  try {
    const admin = await prisma.user.create({
      data: {
        displayName: `Forum Management Admin ${suffix}`,
        email: `forum-management-admin-${suffix}@example.com`,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    ids.adminUserId = admin.id;

    const member = await prisma.user.create({
      data: {
        displayName: `Forum Management Member ${suffix}`,
        email: `forum-management-member-${suffix}@example.com`,
        systemRole: SystemRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    ids.memberUserId = member.id;

    const invitedUser = await prisma.user.create({
      data: {
        displayName: `Forum Management Invited ${suffix}`,
        email: `forum-management-invited-${suffix}@example.com`,
        systemRole: SystemRole.USER,
        status: UserStatus.ACTIVE,
      },
    });
    ids.invitedUserId = invitedUser.id;

    const suspendedUser = await prisma.user.create({
      data: {
        displayName: `Forum Management Suspended ${suffix}`,
        email: `forum-management-suspended-${suffix}@example.com`,
        systemRole: SystemRole.USER,
        status: UserStatus.SUSPENDED,
      },
    });
    ids.suspendedUserId = suspendedUser.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Forum Management Test ${suffix}`,
        createdByUserId: admin.id,
      },
    });
    ids.forumId = forum.id;

    await prisma.forumMember.create({
      data: {
        forumId: forum.id,
        userId: admin.id,
        role: "PARTICIPANT",
      },
    });

    await addForumMemberRecord({
      forumId: forum.id,
      userId: member.id,
      actingUserId: admin.id,
    });

    const membership = await prisma.forumMember.findUnique({
      where: {
        forumId_userId: {
          forumId: forum.id,
          userId: member.id,
        },
      },
    });
    assert(membership, "member should be added");

    await addForumMemberRecord({
      forumId: forum.id,
      userId: suspendedUser.id,
      actingUserId: admin.id,
    }).then(
      () => {
        throw new Error("suspended user should not be added");
      },
      (error) => {
        assert(error instanceof Error, "suspended add should fail");
        assert(error.message === "INVALID_USER", "suspended add should use INVALID_USER");
      },
    );

    await removeForumMemberRecord({
      forumId: forum.id,
      userId: admin.id,
      actingUserId: admin.id,
    }).then(
      () => {
        throw new Error("admin should not remove self");
      },
      (error) => {
        assert(error instanceof Error, "self remove should fail");
        assert(error.message === "FORBIDDEN_SELF_REMOVE", "self remove should be forbidden");
      },
    );

    await removeForumMemberRecord({
      forumId: forum.id,
      userId: member.id,
      actingUserId: admin.id,
    });

    const removedMembership = await prisma.forumMember.findUnique({
      where: {
        forumId_userId: {
          forumId: forum.id,
          userId: member.id,
        },
      },
    });
    assert(!removedMembership, "member should be removed");

    await createInvitationRecord({
      forumId: forum.id,
      email: invitedUser.email!,
      actingUserId: admin.id,
    }).then(
      () => {
        throw new Error("existing user should not be invited");
      },
      (error) => {
        assert(error instanceof Error, "existing user invite should fail");
        assert(error.message === "USER_ALREADY_EXISTS", "existing user invite should use USER_ALREADY_EXISTS");
      },
    );

    const invitation = await createInvitationRecord({
      forumId: forum.id,
      email: `fresh-invite-${suffix}@example.com`,
      actingUserId: admin.id,
    });

    await createInvitationRecord({
      forumId: forum.id,
      email: `fresh-invite-${suffix}@example.com`,
      actingUserId: admin.id,
    }).then(
      () => {
        throw new Error("duplicate invitation should fail");
      },
      (error) => {
        assert(error instanceof Error, "duplicate invitation should fail");
        assert(
          error.message === "INVITATION_ALREADY_EXISTS",
          "duplicate invitation should use INVITATION_ALREADY_EXISTS",
        );
      },
    );

    await cancelInvitationRecord({
      forumId: forum.id,
      invitationId: invitation.id,
    });

    const canceledInvitation = await prisma.invitation.findUnique({
      where: { id: invitation.id },
    });
    assert(canceledInvitation?.status === "CANCELED", "pending invitation should be canceled");

    const acceptedInvitation = await prisma.invitation.create({
      data: {
        forumId: forum.id,
        email: `accepted-invite-${suffix}@example.com`,
        role: "PARTICIPANT",
        token: `accepted-${suffix}`,
        status: "ACCEPTED",
        expiresAt: new Date(Date.now() + 60_000),
        createdByUserId: admin.id,
        acceptedAt: new Date(),
      },
    });

    await cancelInvitationRecord({
      forumId: forum.id,
      invitationId: acceptedInvitation.id,
    }).then(
      () => {
        throw new Error("accepted invitation should not cancel");
      },
      (error) => {
        assert(error instanceof Error, "accepted invitation cancel should fail");
        assert(
          error.message === "INVITATION_NOT_PENDING",
          "accepted invitation cancel should use INVITATION_NOT_PENDING",
        );
      },
    );

    console.log(
      JSON.stringify({
        status: "ok",
        forumId: forum.id,
        invitationId: invitation.id,
      }),
    );
  } finally {
    await cleanup(ids);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
