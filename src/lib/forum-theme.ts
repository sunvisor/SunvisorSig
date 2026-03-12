import type { CSSProperties } from "react";

type ForumThemeSource = {
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
