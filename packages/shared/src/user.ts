/** Public user shape in auth payloads (`phoneMask` e.g. `138****0000`). */
export interface User {
  id: string;
  phoneMask: string;
  nickname: string;
  avatar: string;
}
