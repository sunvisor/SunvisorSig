import { UserStatus } from "@prisma/client";
import { isAppError } from "@/lib/app-error";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { updateProfileRecord } from "@/lib/profile-management";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function cleanup(userIds: string[]) {
  if (userIds.length === 0) {
    return;
  }

  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds,
      },
    },
  }).catch(() => {});
}

async function cleanupHistoricalData() {
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "profile-user-" } },
        { email: { startsWith: "profile-other-" } },
      ],
    },
  });
}

async function main() {
  await cleanupHistoricalData();

  const suffix = Date.now().toString();
  const userIds: string[] = [];

  try {
    const user = await prisma.user.create({
      data: {
        displayName: `Profile User ${suffix}`,
        email: `profile-user-${suffix}@example.com`,
        mentionHandle: `profile-user-${suffix}`,
        passwordHash: hashPassword("password123"),
        status: UserStatus.ACTIVE,
      },
    });
    userIds.push(user.id);

    const otherUser = await prisma.user.create({
      data: {
        displayName: `Profile Other ${suffix}`,
        email: `profile-other-${suffix}@example.com`,
        mentionHandle: `taken-handle-${suffix}`,
        status: UserStatus.ACTIVE,
      },
    });
    userIds.push(otherUser.id);

    await updateProfileRecord({
      userId: user.id,
      displayName: "Updated Name",
      mentionHandle: "updated-handle",
      nextPassword: "newpassword123",
      nextPasswordConfirmation: "newpassword123",
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    assert(updatedUser, "updated user should exist");
    assert(updatedUser.displayName === "Updated Name", "display name should update");
    assert(updatedUser.mentionHandle === "updated-handle", "mention handle should update");
    assert(updatedUser.passwordHash, "password hash should exist");
    assert(verifyPassword("newpassword123", updatedUser.passwordHash), "password should update");

    await updateProfileRecord({
      userId: user.id,
      displayName: "Updated Again",
      mentionHandle: "",
      nextPassword: "",
      nextPasswordConfirmation: "",
    });

    const clearedHandleUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    assert(clearedHandleUser?.mentionHandle === null, "mention handle should clear");

    await updateProfileRecord({
      userId: user.id,
      displayName: "Taken Handle",
      mentionHandle: `taken-handle-${suffix}`,
      nextPassword: "",
      nextPasswordConfirmation: "",
    }).then(
      () => {
        throw new Error("duplicate handle should fail");
      },
      (error) => {
        assert(isAppError(error), "duplicate handle should raise AppError");
        assert(
          error.code === "MENTION_HANDLE_ALREADY_EXISTS",
          "duplicate handle should use MENTION_HANDLE_ALREADY_EXISTS",
        );
      },
    );

    console.log(
      JSON.stringify({
        status: "ok",
        updatedUserId: user.id,
      }),
    );
  } finally {
    await cleanup(userIds);
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
