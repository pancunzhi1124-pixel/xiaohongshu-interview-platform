export type SourceType = "book" | "course" | "notes";

export type KnowledgeCard = {
  id: string;
  sourceType: SourceType;
  sourceTitle: string;
  sourceLocation: string;
  createdAt: string;
  markdown: string;
  tags: string[];
};

const STORAGE_KEY = "zhixin-knowledge-library-v1";
const MAX_CARDS = 100;

function isKnowledgeCard(item: unknown): item is KnowledgeCard {
  if (!item || typeof item !== "object") return false;
  const card = item as Partial<KnowledgeCard>;
  return typeof card.id === "string" &&
    (card.sourceType === "book" || card.sourceType === "course" || card.sourceType === "notes") &&
    typeof card.sourceTitle === "string" &&
    typeof card.sourceLocation === "string" &&
    typeof card.markdown === "string" &&
    typeof card.createdAt === "string" &&
    Array.isArray(card.tags) &&
    card.tags.every((tag) => typeof tag === "string");
}

export function readKnowledgeCards(): KnowledgeCard[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(isKnowledgeCard) : [];
  } catch {
    return [];
  }
}

export function saveKnowledgeCard(card: KnowledgeCard): KnowledgeCard[] {
  if (typeof window === "undefined") return [];
  const current = readKnowledgeCards().filter((item) => item.id !== card.id);
  const next = [card, ...current].slice(0, MAX_CARDS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function importKnowledgeCards(input: unknown): KnowledgeCard[] {
  if (typeof window === "undefined" || !Array.isArray(input)) return readKnowledgeCards();
  const imported = input.filter(isKnowledgeCard);
  const existing = readKnowledgeCards();
  const merged = [...imported, ...existing.filter((item) => !imported.some((candidate) => candidate.id === item.id))].slice(0, MAX_CARDS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

export function removeKnowledgeCard(id: string): KnowledgeCard[] {
  if (typeof window === "undefined") return [];
  const next = readKnowledgeCards().filter((item) => item.id !== id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function tokens(value: string): Set<string> {
  const normalized = value.toLocaleLowerCase().replace(/https?:\/\/\S+/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ");
  const output = new Set(normalized.split(/\s+/).filter((item) => item.length >= 2));
  const chinese = normalized.replace(/[^\u3400-\u9fff]/g, "");
  for (let i = 0; i < chinese.length - 1; i += 1) output.add(chinese.slice(i, i + 2));
  return output;
}

export function selectRelevantKnowledge(cards: KnowledgeCard[], query: string, limit = 5): KnowledgeCard[] {
  if (cards.length === 0 || !query.trim()) return [];
  const queryTokens = tokens(query);
  const scored = cards.map((card, index) => {
    const sourceText = [card.sourceTitle, card.sourceLocation, card.tags.join(" "), card.markdown.slice(0, 5000)].join(" ");
    const sourceTokens = tokens(sourceText);
    let score = 0;
    for (const token of queryTokens) {
      if (sourceTokens.has(token)) score += token.length > 2 ? 2 : 1;
    }
    return { card, score, index };
  });
  return scored.filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, limit).map((item) => item.card);
}

export function createKnowledgeTags(sourceTitle: string, sourceType: SourceType, markdown: string): string[] {
  const terms = [sourceTitle, sourceType === "book" ? "心理学书籍" : sourceType === "course" ? "教师课程" : "学习笔记"];
  const headingTerms = markdown.match(/^#{1,3}\s+.+$/gm) || [];
  return Array.from(new Set([...terms, ...headingTerms.map((item) => item.replace(/^#+\s+/, "").trim())])).slice(0, 20);
}
