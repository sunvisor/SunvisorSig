export const ui = {
  page: {
    shell: "theme-page-shell min-h-screen px-6 py-10",
    container: "mx-auto flex w-full max-w-6xl flex-col gap-8",
    sectionGrid: "grid gap-6",
    twoColumnGrid: "grid gap-6 lg:grid-cols-[2fr_1fr]",
  },
  surface: {
    hero: "theme-hero rounded-4xl border p-8 shadow-xl shadow-slate-900/5 backdrop-blur",
    card: "theme-card rounded-[1.75rem] border p-6 shadow-lg shadow-slate-900/5 backdrop-blur",
    listItem: "theme-list-item rounded-2xl border transition",
    mutedCard: "theme-muted-card rounded-2xl border",
    empty: "theme-empty rounded-2xl border border-dashed p-6",
  },
  text: {
    eyebrow: "theme-accent-text text-sm font-medium uppercase tracking-[0.28em]",
    title: "theme-text mt-3 text-4xl font-semibold tracking-tight md:text-5xl",
    description: "theme-text-muted mt-4 max-w-3xl text-base leading-7 md:text-lg",
    sectionTitle: "theme-text text-lg font-semibold",
    body: "theme-text-muted text-sm leading-7",
    meta: "theme-text-muted text-xs uppercase tracking-[0.2em]",
    subtleMeta: "theme-text-subtle text-xs uppercase tracking-[0.2em]",
    label: "theme-text text-sm font-medium",
    value: "theme-text text-sm",
  },
  button: {
    primary:
      "theme-primary-button inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium text-white transition",
    primaryLink:
      "theme-primary-button inline-flex items-center rounded-full px-4 py-2 text-sm font-medium !text-white transition",
    secondary:
      "theme-card theme-text-muted inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-medium transition",
    danger:
      "inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50",
    dangerCompact:
      "rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50",
    modalGhost:
      "inline-flex items-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:border-slate-400 hover:bg-slate-800",
    modalDanger:
      "inline-flex items-center rounded-full bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400",
    disabled: "disabled:cursor-not-allowed disabled:bg-slate-400",
  },
  form: {
    layout: "grid gap-6",
    group: "grid gap-2",
    select: "theme-input rounded-2xl border px-4 py-3 text-sm outline-none transition",
    input: "theme-input rounded-2xl border px-4 py-3 text-sm outline-none transition",
    textarea: "theme-input rounded-3xl border px-4 py-4 text-sm leading-7 outline-none transition",
    fileInput:
      "theme-input rounded-2xl border border-dashed px-4 py-5 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--theme-accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white",
    fileInputMuted:
      "theme-input-muted rounded-2xl border border-dashed px-4 py-5 text-sm file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--theme-accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white",
    actions: "flex items-center gap-3",
    panel: "theme-muted-card grid gap-4 rounded-2xl border p-5",
  },
  modal: {
    overlay: "fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-6",
    shell: "overflow-hidden rounded-[2rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/40",
    header: "flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-4",
    body: "px-6 py-5",
    footer: "flex items-center justify-end gap-3 px-6 py-5",
  },
  list: {
    attachmentGrid: "mt-4 grid gap-3",
    metadataGrid: "grid gap-3",
    metadataGrid3: "grid gap-3 md:grid-cols-3",
    responsiveCards: "grid gap-3 md:grid-cols-2",
  },
} as const;
