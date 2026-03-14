import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checkedAt = new Date().toISOString();

  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      ok: true,
      app: "up",
      db: "up",
      checkedAt,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        app: "up",
        db: "down",
        checkedAt,
      },
      { status: 503 },
    );
  }
}
