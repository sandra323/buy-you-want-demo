const memory = new Map<string, string>();
let nextGetError: Error | null = null;
let nextSetError: Error | null = null;

export async function getItem(key: string): Promise<string | null> {
  if (nextGetError) {
    const error = nextGetError;
    nextGetError = null;
    throw error;
  }
  return memory.get(key) ?? null;
}

export async function setItem(key: string, value: string): Promise<void> {
  if (nextSetError) {
    const error = nextSetError;
    nextSetError = null;
    throw error;
  }
  memory.set(key, value);
}

export async function removeItem(key: string): Promise<void> {
  memory.delete(key);
}

export function __resetAsyncStorage(): void {
  memory.clear();
  nextGetError = null;
  nextSetError = null;
}

export function __failNextAsyncStorageGet(
  error = new Error('AsyncStorage read failed'),
): void {
  nextGetError = error;
}

export function __failNextAsyncStorageSet(
  error = new Error('AsyncStorage write failed'),
): void {
  nextSetError = error;
}

export default {
  getItem,
  setItem,
  removeItem,
};
