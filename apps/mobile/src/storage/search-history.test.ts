import AsyncStorage from '@react-native-async-storage/async-storage';

import { __resetAsyncStorage } from '../test/mocks/async-storage';
import {
  SEARCH_HISTORY_KEY,
  addSearchHistory,
  clearSearchHistory,
  readSearchHistory,
} from './search-history';

describe('search history', () => {
  beforeEach(() => {
    __resetAsyncStorage();
  });

  it('keeps the newest ten unique keywords', async () => {
    for (let index = 0; index < 11; index += 1) {
      await addSearchHistory(`商品 ${index}`);
    }
    await addSearchHistory('  商品 5  ');

    expect(await readSearchHistory()).toEqual([
      '商品 5',
      '商品 10',
      '商品 9',
      '商品 8',
      '商品 7',
      '商品 6',
      '商品 4',
      '商品 3',
      '商品 2',
      '商品 1',
    ]);
  });

  it('tolerates malformed stored data and clears it', async () => {
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, '{broken');
    expect(await readSearchHistory()).toEqual([]);

    await addSearchHistory('手机');
    await clearSearchHistory();
    expect(await readSearchHistory()).toEqual([]);
  });
});
