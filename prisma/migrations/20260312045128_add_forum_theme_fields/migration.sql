-- AlterTable
ALTER TABLE "Forum" ADD COLUMN     "themeAccent" TEXT NOT NULL DEFAULT '#0f766e',
ADD COLUMN     "themeAccentSoft" TEXT NOT NULL DEFAULT '#ccfbf1',
ADD COLUMN     "themeBorder" TEXT NOT NULL DEFAULT '#cbd5e1',
ADD COLUMN     "themeName" TEXT NOT NULL DEFAULT 'Ocean',
ADD COLUMN     "themePageFrom" TEXT NOT NULL DEFAULT '#f8fafc',
ADD COLUMN     "themePageTo" TEXT NOT NULL DEFAULT '#eff6ff',
ADD COLUMN     "themeSurface" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "themeSurfaceMuted" TEXT NOT NULL DEFAULT '#f8fafc',
ADD COLUMN     "themeText" TEXT NOT NULL DEFAULT '#0f172a',
ADD COLUMN     "themeTextMuted" TEXT NOT NULL DEFAULT '#475569',
ADD COLUMN     "themeTextSubtle" TEXT NOT NULL DEFAULT '#94a3b8';
