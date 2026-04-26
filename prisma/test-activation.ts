import { randomBytes } from "node:crypto";
import { SystemRole, UserStatus } from "@prisma/client";
import { activateInvitationRecord, getInvitationForActivation } from "@/lib/invitation-activation";
import { isAppError } from "@/lib/app-error";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(ids: {
  forumId?: string;
  adminUserId?: string;
  activeInvitationId?: string;
  expiredInvitationId?: string;
  canceledInvitationId?: string;
  acceptedInvitationId?: string;
}) {
  for (const invitationId of [
    ids.activeInvitationId,
    ids.expiredInvitationId,
    ids.canceledInvitationId,
    ids.acceptedInvitationId,
  ]) {
    if (!invitationId) {
      continue;
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    }).catch(() => {});
  }

  if (ids.forumId) {
    await prisma.forum.delete({
      where: { id: ids.forumId },
    }).catch(() => {});
  }

  if (ids.adminUserId) {
    await prisma.user.delete({
      where: { id: ids.adminUserId },
    }).catch(() => {});
  }

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: "activation-user-",
      },
    },
  }).catch(() => {});
}

async function cleanupHistoricalData() {
  await prisma.forum.deleteMany({
    where: {
      name: {
        startsWith: "Activation Forum ",
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      OR: [
        {
          email: {
            startsWith: "activation-admin-",
          },
        },
        {
          email: {
            startsWith: "activation-user-",
          },
        },
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
    activeInvitationId?: string;
    expiredInvitationId?: string;
    canceledInvitationId?: string;
    acceptedInvitationId?: string;
  } = {};

  try {
    const admin = await prisma.user.create({
      data: {
        displayName: `Activation Admin ${suffix}`,
        email: `activation-admin-${suffix}@example.com`,
        mentionHandle: `activation-admin-${suffix}`,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    ids.adminUserId = admin.id;

    const forum = await prisma.forum.create({
      data: {
        name: `Activation Forum ${suffix}`,
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

    const activeInvitation = await prisma.invitation.create({
      data: {
        forumId: forum.id,
        email: `activation-user-${suffix}@example.com`,
        token: randomBytes(24).toString("hex"),
        role: "PARTICIPANT",
        status: "PENDING",
        expiresAt: new Date(Date.now() + 60_000),
        createdByUserId: admin.id,
      },
    });
    ids.activeInvitationId = activeInvitation.id;

    await activateInvitationRecord({
      token: activeInvitation.token,
      displayName: "Activated User",
      password: "password123",
      passwordConfirmation: "password123",
    });

    const activatedInvitation = await prisma.invitation.findUnique({
      where: { id: activeInvitation.id },
    });
    assert(activatedInvitation?.status === "ACCEPTED", "invitation should be accepted");
    assert(activatedInvitation.acceptedAt, "accepted invitation should have acceptedAt");

    const activatedUser = await prisma.user.findUnique({
      where: { email: activeInvitation.email },
    });
    assert(activatedUser, "activated user should be created");
    assert(activatedUser.status === "ACTIVE", "activated user should be active");
    assert(activatedUser.passwordHash, "activated user should have password hash");
    assert(await verifyPassword("password123", activatedUser.passwordHash), "password should verify");

    const membership = await prisma.forumMember.findUnique({
      where: {
        forumId_userId: {
          forumId: forum.id,
          userId: activatedUser.id,
        },
      },
    });
    assert(membership, "activated user should join the forum");

    const invitationPreview = await getInvitationForActivation(activeInvitation.token);
    assert(
      invitationPreview?.activationErrorCode === "INVITATION_ACCEPTED",
      "accepted invitation should surface accepted state",
    );

    const expiredInvitation = await prisma.invitation.create({
      data: {
        forumId: forum.id,
        email: `activation-user-expired-${suffix}@example.com`,
        token: randomBytes(24).toString("hex"),
        role: "PARTICIPANT",
        status: "PENDING",
        expiresAt: new Date(Date.now() - 60_000),
        createdByUserId: admin.id,
      },
    });
    ids.expiredInvitationId = expiredInvitation.id;

    await activateInvitationRecord({
      token: expiredInvitation.token,
      displayName: "Expired User",
      password: "password123",
      passwordConfirmation: "password123",
    }).then(
      () => {
        throw new Error("expired invitation should not activate");
      },
      (error) => {
        assert(isAppError(error), "expired invitation should raise AppError");
        assert(error.code === "INVITATION_EXPIRED", "expired invitation should use INVITATION_EXPIRED");
      },
    );

    const expiredAfterAttempt = await prisma.invitation.findUnique({
      where: { id: expiredInvitation.id },
    });
    assert(expiredAfterAttempt?.status === "EXPIRED", "expired invitation should be marked expired");

    const canceledInvitation = await prisma.invitation.create({
      data: {
        forumId: forum.id,
        email: `activation-user-canceled-${suffix}@example.com`,
        token: randomBytes(24).toString("hex"),
        role: "PARTICIPANT",
        status: "CANCELED",
        expiresAt: new Date(Date.now() + 60_000),
        createdByUserId: admin.id,
        canceledAt: new Date(),
      },
    });
    ids.canceledInvitationId = canceledInvitation.id;

    await activateInvitationRecord({
      token: canceledInvitation.token,
      displayName: "Canceled User",
      password: "password123",
      passwordConfirmation: "password123",
    }).then(
      () => {
        throw new Error("canceled invitation should not activate");
      },
      (error) => {
        assert(isAppError(error), "canceled invitation should raise AppError");
        assert(error.code === "INVITATION_CANCELED", "canceled invitation should use INVITATION_CANCELED");
      },
    );

    const acceptedInvitation = await prisma.invitation.create({
      data: {
        forumId: forum.id,
        email: `activation-user-accepted-${suffix}@example.com`,
        token: randomBytes(24).toString("hex"),
        role: "PARTICIPANT",
        status: "ACCEPTED",
        expiresAt: new Date(Date.now() + 60_000),
        createdByUserId: admin.id,
        acceptedAt: new Date(),
      },
    });
    ids.acceptedInvitationId = acceptedInvitation.id;

    await activateInvitationRecord({
      token: acceptedInvitation.token,
      displayName: "Accepted User",
      password: "password123",
      passwordConfirmation: "password123",
    }).then(
      () => {
        throw new Error("accepted invitation should not activate twice");
      },
      (error) => {
        assert(isAppError(error), "accepted invitation should raise AppError");
        assert(error.code === "INVITATION_ACCEPTED", "accepted invitation should use INVITATION_ACCEPTED");
      },
    );

    console.log(
      JSON.stringify({
        status: "ok",
        activatedUserId: activatedUser.id,
        activatedForumId: forum.id,
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
