/** MySQL LIKE escape character (must match ESCAPE clause in the query). */
export const LIKE_ESCAPE_CHAR = '\\';

/**
 * 先转义 `\` 再转 `%`/`_`，否则通配符会被二次改写。
 * Repository 内转义；不要让客户端自己拼 LIKE。
 */
export function escapeLikePattern(raw: string): string {
  return raw
    .replaceAll('\\', `${LIKE_ESCAPE_CHAR}\\`)
    .replaceAll('%', `${LIKE_ESCAPE_CHAR}%`)
    .replaceAll('_', `${LIKE_ESCAPE_CHAR}_`);
}
