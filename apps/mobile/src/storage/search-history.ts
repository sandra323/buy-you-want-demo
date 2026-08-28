import AsyncStorage from '@react-native-async-storage/async-storage';

export const SEARCH_HISTORY_KEY = 'search_history';
export const SEARCH_HISTORY_LIMIT = 10;

function normalizeHistory(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const history: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') {
      continue;
    }
    const keyword = entry.trim();
    if (!keyword || seen.has(keyword)) {
      continue;
    }
    seen.add(keyword);
    history.push(keyword);
    if (history.length === SEARCH_HISTORY_LIMIT) {
      break;
    }
  }
  return history;
}

export async function readSearchHistory(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
  if (!raw) {
    return [];
  }
  try {
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function addSearchHistory(keyword: string): Promise<string[]> {
  const normalized = keyword.trim();
  if (!normalized) {
    return readSearchHistory();
  }

  const current = await readSearchHistory();
  const next = [
    normalized,
    ...current.filter((entry) => entry !== normalized),
  ].slice(0, SEARCH_HISTORY_LIMIT);
  await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  return next;
}

export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
}
