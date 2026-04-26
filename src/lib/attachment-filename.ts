function sanitizeFilename(filename: string) {
  return filename
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitFilename(filename: string) {
  const basename = filename.split(/[\\/]/).pop() ?? filename;
  const dotIndex = basename.lastIndexOf(".");
  const hasExtension = dotIndex > 0;
  const ext = hasExtension ? basename.slice(dotIndex) : "";
  const base = hasExtension ? basename.slice(0, dotIndex) : basename;
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
