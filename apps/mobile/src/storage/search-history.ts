import AsyncStorage from '@react-native-async-storage/async-storage';

/** Spec key; writes land in Task 8.2. Logout still must wipe this. */
export const SEARCH_HISTORY_KEY = 'search_history';

export async function clearSearchHistory(): Promise<void> {
  await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
}
