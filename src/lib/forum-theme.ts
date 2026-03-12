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
