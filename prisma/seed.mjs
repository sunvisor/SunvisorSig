import { PrismaClient, SystemRole, UserStatus } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";

// Cloudflare Workers' Web Crypto caps PBKDF2 at 100,000 iterations.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH_BITS = 256;

function getLocalDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("file:")) {
    return databaseUrl;
  }

  return "file:./dev.db";
}

async function createPrismaClient() {
  if (process.env.SEED_DATABASE !== "file") {
    const { getPlatformProxy } = await import("wrangler");
    const platform = await getPlatformProxy({ envFiles: [] });

    if (platform.env.DB) {
      return {
        prisma: new PrismaClient({
          adapter: new PrismaD1(platform.env.DB),
        }),
        bucket: platform.env.ATTACHMENTS,
        dispose: platform.dispose,
      };
    }

    await platform.dispose();
  }

  return {
    prisma: new PrismaClient({
      datasourceUrl: getLocalDatabaseUrl(),
    }),
    bucket: undefined,
    dispose: async () => {},
  };
}

const { prisma, bucket, dispose } = await createPrismaClient();

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function derivePasswordHash(password, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH_BITS,
  );

  return new Uint8Array(bits);
}

async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePasswordHash(password, salt);

  return `pbkdf2-sha256:${PBKDF2_ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(hash)}`;
}

async function putSeedAttachment(key, body, mimeType) {
  if (!bucket) {
    return;
  }

  await bucket.put(key, body, {
    httpMetadata: {
      contentType: mimeType,
    },
  });
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.channelSubscription.deleteMany();
  await prisma.commentAttachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postAttachment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.forumMember.deleteMany();
  await prisma.forum.deleteMany();
  await prisma.user.deleteMany();

  const [adminPasswordHash, customerAPasswordHash, customerBPasswordHash] = await Promise.all([
    hashPassword("password123"),
    hashPassword("password123"),
    hashPassword("password123"),
  ]);

  const [admin, customerA, customerB] = await Promise.all([
    prisma.user.create({
      data: {
        displayName: "Sunvisor Admin",
        email: "admin@example.com",
        mentionHandle: "admin",
        passwordHash: adminPasswordHash,
        systemRole: SystemRole.ADMIN,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        displayName: "Acme Customer",
        email: "acme@example.com",
        mentionHandle: "acme",
        passwordHash: customerAPasswordHash,
        systemRole: SystemRole.USER,
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        displayName: "Globex Customer",
        email: "globex@example.com",
        mentionHandle: "globex",
        passwordHash: customerBPasswordHash,
        systemRole: SystemRole.USER,
        status: UserStatus.ACTIVE,
      },
    }),
  ]);

  const acmeForum = await prisma.forum.create({
    data: {
      name: "Acme 導入フォーラム",
      description: "Acme 向けの導入・運用相談フォーラム",
      themeName: "Sunset",
      themeAccent: "#c2410c",
      themeAccentSoft: "#ffedd5",
      themeSurface: "#fffaf5",
      themeSurfaceMuted: "#fff7ed",
      themeBorder: "#fdba74",
      themeText: "#7c2d12",
      themeTextMuted: "#9a3412",
      themeTextSubtle: "#c2410c",
      themePageFrom: "#fff7ed",
      themePageTo: "#ffedd5",
      createdByUserId: admin.id,
    },
  });

  const globexForum = await prisma.forum.create({
    data: {
      name: "Globex 運用フォーラム",
      description: "Globex 向けの定例運用と障害対応フォーラム",
      themeName: "Ocean",
      themeAccent: "#0369a1",
      themeAccentSoft: "#dbeafe",
      themeSurface: "#f8fbff",
      themeSurfaceMuted: "#eff6ff",
      themeBorder: "#93c5fd",
      themeText: "#0f172a",
      themeTextMuted: "#1d4ed8",
      themeTextSubtle: "#60a5fa",
      themePageFrom: "#f8fbff",
      themePageTo: "#dbeafe",
      createdByUserId: admin.id,
    },
  });

  const initechForum = await prisma.forum.create({
    data: {
      name: "Initech 企画フォーラム",
      description: "Initech 向けの要件整理と企画相談フォーラム",
      themeName: "Forest",
      themeAccent: "#166534",
      themeAccentSoft: "#dcfce7",
      themeSurface: "#f7fff9",
      themeSurfaceMuted: "#f0fdf4",
      themeBorder: "#86efac",
      themeText: "#14532d",
      themeTextMuted: "#166534",
      themeTextSubtle: "#4ade80",
      themePageFrom: "#f7fee7",
      themePageTo: "#dcfce7",
      createdByUserId: admin.id,
    },
  });

  await prisma.forumMember.createMany({
    data: [
      { forumId: acmeForum.id, userId: admin.id, role: "PARTICIPANT" },
      { forumId: acmeForum.id, userId: customerA.id, role: "PARTICIPANT" },
      { forumId: acmeForum.id, userId: customerB.id, role: "PARTICIPANT" },
      { forumId: globexForum.id, userId: admin.id, role: "PARTICIPANT" },
      { forumId: globexForum.id, userId: customerB.id, role: "PARTICIPANT" },
      { forumId: initechForum.id, userId: admin.id, role: "PARTICIPANT" },
      { forumId: initechForum.id, userId: customerA.id, role: "PARTICIPANT" },
    ],
  });

  const [announcements, qa, globexIncidentChannel, initechPlanningChannel] =
    await Promise.all([
    prisma.channel.create({
      data: {
        forumId: acmeForum.id,
        name: "お知らせ",
        description: "運用連絡や告知用のチャンネル",
        createdByUserId: admin.id,
      },
    }),
    prisma.channel.create({
      data: {
        forumId: acmeForum.id,
        name: "質疑応答",
        description: "質問と回答をやり取りするチャンネル",
        createdByUserId: admin.id,
      },
    }),
    prisma.channel.create({
      data: {
        forumId: globexForum.id,
        name: "障害対応",
        description: "障害報告と一次対応の共有",
        createdByUserId: admin.id,
      },
    }),
    prisma.channel.create({
      data: {
        forumId: initechForum.id,
        name: "企画相談",
        description: "新機能案と要件整理の相談",
        createdByUserId: admin.id,
      },
    }),
    ]);

  const welcomePost = await prisma.post.create({
    data: {
      channelId: announcements.id,
      authorUserId: admin.id,
      title: "フォーラムを開設しました",
      bodyMarkdown:
        "このフォーラムでは導入・運用に関するやり取りを行います。\n\n必要な資料は [ご利用ガイド](attachment:guide.pdf) から確認してください。",
    },
  });

  await prisma.postAttachment.create({
    data: {
      postId: welcomePost.id,
      storagePath: "/attachments/posts/seed/guide.pdf",
      originalFilename: "guide.pdf",
      mimeType: "application/pdf",
      sizeBytes: 245760,
    },
  });
  await putSeedAttachment(
    "posts/seed/guide.pdf",
    "SunvisorSig seed guide",
    "application/pdf",
  );

  const questionPost = await prisma.post.create({
    data: {
      channelId: qa.id,
      authorUserId: customerA.id,
      status: "IN_PROGRESS",
      title: "初期設定の確認ポイント",
      bodyMarkdown:
        "初期設定で確認すべき項目をまとめたいです。\n\n画面キャプチャは [設定画面](attachment:setup.png) を参照してください。",
    },
  });

  await prisma.postAttachment.create({
    data: {
      postId: questionPost.id,
      storagePath: "/attachments/posts/seed/setup.png",
      originalFilename: "setup.png",
      mimeType: "image/png",
      sizeBytes: 98304,
    },
  });
  await putSeedAttachment(
    "posts/seed/setup.png",
    "SunvisorSig seed setup image",
    "image/png",
  );

  const adminComment = await prisma.comment.create({
    data: {
      postId: questionPost.id,
      authorUserId: admin.id,
      bodyMarkdown:
        "最初は接続設定、通知設定、参加者の確認が重要です。\n\n補足資料は [チェックリスト](attachment:checklist.xlsx) を参照してください。",
    },
  });

  await prisma.commentAttachment.create({
    data: {
      commentId: adminComment.id,
      storagePath: "/attachments/comments/seed/checklist.xlsx",
      originalFilename: "checklist.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 40960,
    },
  });
  await putSeedAttachment(
    "comments/seed/checklist.xlsx",
    "SunvisorSig seed checklist",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );

  await prisma.comment.create({
    data: {
      postId: questionPost.id,
      authorUserId: customerB.id,
      bodyMarkdown: "ありがとうございます。手順を確認して進めます。",
    },
  });

  await prisma.channelSubscription.createMany({
    data: [
      { channelId: qa.id, userId: admin.id },
      { channelId: qa.id, userId: customerB.id },
      { channelId: globexIncidentChannel.id, userId: admin.id },
    ],
  });

  await prisma.post.create({
    data: {
      channelId: globexIncidentChannel.id,
      authorUserId: customerB.id,
      status: "TODO",
      title: "夜間バッチの監視について",
      bodyMarkdown:
        "夜間バッチの失敗通知をこのチャンネルで確認できるようにしたいです。",
    },
  });

  await prisma.post.create({
    data: {
      channelId: initechPlanningChannel.id,
      authorUserId: customerA.id,
      status: "DONE",
      title: "次期リリースの要望整理",
      bodyMarkdown:
        "企画候補をここで整理して、優先度を決めていきたいです。",
    },
  });

  console.log(
    JSON.stringify(
      {
        users: 3,
        forums: 3,
        channels: 4,
        posts: 4,
        comments: 2,
        loginPassword: "password123",
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await dispose();
  });
