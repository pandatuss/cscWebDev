
export function safeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
