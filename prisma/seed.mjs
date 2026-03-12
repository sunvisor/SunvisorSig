import { PrismaClient, ForumRole, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.commentAttachment.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postAttachment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.forumMember.deleteMany();
  await prisma.forum.deleteMany();
  await prisma.user.deleteMany();

  const [admin, customerA, customerB] = await Promise.all([
    prisma.user.create({
      data: {
        displayName: "Sunvisor Admin",
        email: "admin@example.com",
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        displayName: "Acme Customer",
        email: "acme@example.com",
        status: UserStatus.ACTIVE,
      },
    }),
    prisma.user.create({
      data: {
        displayName: "Globex Customer",
        email: "globex@example.com",
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
      { forumId: acmeForum.id, userId: admin.id, role: ForumRole.ADMIN },
      { forumId: acmeForum.id, userId: customerA.id, role: ForumRole.PARTICIPANT },
      { forumId: acmeForum.id, userId: customerB.id, role: ForumRole.PARTICIPANT },
      { forumId: globexForum.id, userId: admin.id, role: ForumRole.ADMIN },
      { forumId: globexForum.id, userId: customerB.id, role: ForumRole.PARTICIPANT },
      { forumId: initechForum.id, userId: admin.id, role: ForumRole.ADMIN },
      { forumId: initechForum.id, userId: customerA.id, role: ForumRole.PARTICIPANT },
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
      storagePath: "uploads/posts/guide.pdf",
      originalFilename: "guide.pdf",
      mimeType: "application/pdf",
      sizeBytes: 245760,
    },
  });

  const questionPost = await prisma.post.create({
    data: {
      channelId: qa.id,
      authorUserId: customerA.id,
      title: "初期設定の確認ポイント",
      bodyMarkdown:
        "初期設定で確認すべき項目をまとめたいです。\n\n画面キャプチャは [設定画面](attachment:setup.png) を参照してください。",
    },
  });

  await prisma.postAttachment.create({
    data: {
      postId: questionPost.id,
      storagePath: "uploads/posts/setup.png",
      originalFilename: "setup.png",
      mimeType: "image/png",
      sizeBytes: 98304,
    },
  });

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
      storagePath: "uploads/comments/checklist.xlsx",
      originalFilename: "checklist.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 40960,
    },
  });

  await prisma.comment.create({
    data: {
      postId: questionPost.id,
      authorUserId: customerB.id,
      bodyMarkdown: "ありがとうございます。手順を確認して進めます。",
    },
  });

  await prisma.post.create({
    data: {
      channelId: globexIncidentChannel.id,
      authorUserId: customerB.id,
      title: "夜間バッチの監視について",
      bodyMarkdown:
        "夜間バッチの失敗通知をこのチャンネルで確認できるようにしたいです。",
    },
  });

  await prisma.post.create({
    data: {
      channelId: initechPlanningChannel.id,
      authorUserId: customerA.id,
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
  });
