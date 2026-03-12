import type { CSSProperties } from "react";

export type ForumThemeSource = {
  themeName: string;
  themeAccent: string;
  themeAccentSoft: string;
  themeSurface: string;
  themeSurfaceMuted: string;
  themeBorder: string;
  themeText: string;
  themeTextMuted: string;
  themeTextSubtle: string;
  themePageFrom: string;
  themePageTo: string;
};

export const forumThemePresets: ForumThemeSource[] = [
  {
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
  },
  {
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
  },
  {
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
  },
];

export function getForumThemePreset(themeName: string) {
  return (
    forumThemePresets.find((preset) => preset.themeName === themeName) ??
    forumThemePresets[1]
  );
}

export function getForumThemeStyle(theme: ForumThemeSource): CSSProperties {
  return {
    "--theme-accent": theme.themeAccent,
    "--theme-accent-soft": theme.themeAccentSoft,
    "--theme-surface": theme.themeSurface,
    "--theme-surface-muted": theme.themeSurfaceMuted,
    "--theme-border": theme.themeBorder,
    "--theme-text": theme.themeText,
    "--theme-text-muted": theme.themeTextMuted,
    "--theme-text-subtle": theme.themeTextSubtle,
    "--theme-page-from": theme.themePageFrom,
    "--theme-page-to": theme.themePageTo,
  } as CSSProperties;
}

export function getForumCardStyle(theme: ForumThemeSource): CSSProperties {
  return {
    ...getForumThemeStyle(theme),
    background: `linear-gradient(180deg, ${theme.themeSurface} 0%, ${theme.themeSurfaceMuted} 100%)`,
    borderColor: theme.themeBorder,
    boxShadow: `0 24px 60px -28px ${theme.themeAccent}33`,
  };
}

export function getForumPageStyle(theme: ForumThemeSource): CSSProperties {
  return {
    ...getForumThemeStyle(theme),
    background: `radial-gradient(circle at top, ${theme.themeAccentSoft} 0%, transparent 42%), linear-gradient(180deg, ${theme.themePageFrom} 0%, ${theme.themePageTo} 100%)`,
  };
}

export function getForumHeroStyle(theme: ForumThemeSource): CSSProperties {
  return {
    background: `linear-gradient(135deg, ${theme.themeSurface} 0%, ${theme.themeSurfaceMuted} 100%)`,
    borderColor: theme.themeBorder,
    boxShadow: `0 24px 60px -28px ${theme.themeAccent}40`,
  };
}
