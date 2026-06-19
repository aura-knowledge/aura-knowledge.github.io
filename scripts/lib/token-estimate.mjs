export function estimateTokens(text) {
  if (!text || typeof text !== "string") {
    return 0;
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  return Math.ceil(words.length * 1.35);
}
