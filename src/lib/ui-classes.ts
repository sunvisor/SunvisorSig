export const ui = {
  page: {
    shell: "min-h-screen px-6 py-10",
    container: "mx-auto flex w-full max-w-6xl flex-col gap-8",
    sectionGrid: "grid gap-6",
    twoColumnGrid: "grid gap-6 lg:grid-cols-[2fr_1fr]",
  },
  surface: {
    hero: "rounded-4xl border border-[color:var(--theme-border)] bg-[color:color-mix(in_srgb,var(--theme-surface)_88%,transparent)] p-8 shadow-xl shadow-slate-900/5 backdrop-blur",
    card: "rounded-[1.75rem] border border-[color:var(--theme-border)] bg-[color:color-mix(in_srgb,var(--theme-surface)_88%,transparent)] p-6 shadow-lg shadow-slate-900/5 backdrop-blur",
    listItem:
      "rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-muted)] transition hover:border-[color:var(--theme-accent)] hover:bg-[color:var(--theme-surface)]",
    mutedCard: "rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-muted)]",
    empty: "rounded-2xl border border-dashed border-[color:var(--theme-border)] bg-[color:var(--theme-surface-muted)] p-6",
  },
  text: {
    eyebrow: "text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--theme-accent)]",
    title: "mt-3 text-4xl font-semibold tracking-tight text-[color:var(--theme-text)] md:text-5xl",
    description: "mt-4 max-w-3xl text-base leading-7 text-[color:var(--theme-text-muted)] md:text-lg",
    sectionTitle: "text-lg font-semibold text-[color:var(--theme-text)]",
    body: "text-sm leading-7 text-[color:var(--theme-text-muted)]",
    meta: "text-xs uppercase tracking-[0.2em] text-[color:var(--theme-text-muted)]",
    subtleMeta: "text-xs uppercase tracking-[0.2em] text-[color:var(--theme-text-subtle)]",
    label: "text-sm font-medium text-[color:var(--theme-text)]",
    value: "text-sm text-[color:var(--theme-text)]",
  },
  button: {
    primary:
      "inline-flex items-center justify-center rounded-full bg-[color:var(--theme-accent)] px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110",
    primaryLink:
      "inline-flex items-center rounded-full bg-[color:var(--theme-accent)] px-4 py-2 text-sm font-medium !text-white transition hover:brightness-110",
    secondary:
      "inline-flex items-center justify-center rounded-full border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-5 py-2.5 text-sm font-medium text-[color:var(--theme-text-muted)] transition hover:border-[color:var(--theme-accent)] hover:bg-[color:var(--theme-surface-muted)]",
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
    select:
      "rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-3 text-sm text-[color:var(--theme-text)] outline-none transition focus:border-[color:var(--theme-accent)]",
    input:
      "rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-3 text-sm text-[color:var(--theme-text)] outline-none transition focus:border-[color:var(--theme-accent)]",
    textarea:
      "rounded-3xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-4 text-sm leading-7 text-[color:var(--theme-text)] outline-none transition focus:border-[color:var(--theme-accent)]",
    fileInput:
      "rounded-2xl border border-dashed border-[color:var(--theme-border)] bg-[color:var(--theme-surface)] px-4 py-5 text-sm text-[color:var(--theme-text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--theme-accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white",
    fileInputMuted:
      "rounded-2xl border border-dashed border-[color:var(--theme-border)] bg-[color:var(--theme-surface-muted)] px-4 py-5 text-sm text-[color:var(--theme-text-muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--theme-accent)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white",
    actions: "flex items-center gap-3",
    panel: "grid gap-4 rounded-2xl border border-[color:var(--theme-border)] bg-[color:var(--theme-surface-muted)] p-5",
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
