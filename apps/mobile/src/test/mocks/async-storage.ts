const memory = new Map<string, string>();

export async function getItem(key: string): Promise<string | null> {
  return memory.get(key) ?? null;
}

export async function setItem(key: string, value: string): Promise<void> {
  memory.set(key, value);
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key);
}

export function __resetAsyncStorage(): void {
  memory.clear();
}

export default {
  getItem,
  setItem,
  removeItem,
};
