import path from "node:path";

function sanitizeFilename(filename: string) {
  return filename
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFilename(filename: string) {
  const ext = path.extname(filename);
  const base = ext ? filename.slice(0, -ext.length) : filename;
  return { base, ext };
}

export function buildDedupedFilename(filename: string, usedNames: Set<string>) {
  const safeName = sanitizeFilename(filename) || "file";

  if (!usedNames.has(safeName)) {
    usedNames.add(safeName);
    return safeName;
  }

  const { base, ext } = splitFilename(safeName);
  let index = 2;

  while (true) {
    const candidate = `${base}(${index})${ext}`;

    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }

    index += 1;
  }
}
