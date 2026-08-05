/**
 * API 오류에서 사용자에게 보여줄 메시지를 꺼낸다.
 *
 * 여러 화면이 `catch (err)` 뒤에 `err.response?.data?.message`를 직접 읽는 코드를
 * 각자 반복하고 있었다. 같은 판단을 한곳에 모아 두면 catch 인자를 unknown으로 받을 수 있고,
 * 서버가 빈 문자열을 내려보내도 화면에 빈 오류가 뜨지 않는다.
 */

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

/**
 * 서버가 내려준 메시지. 백엔드가 한국어로 응답하므로 한국어 로케일에서만 쓰는 것을 전제로 한다.
 */
export const serverErrorMessage = (error: unknown): string | undefined =>
  readString((error as { response?: { data?: { message?: unknown } } })?.response?.data?.message);

/**
 * 서버 메시지가 없으면 Error.message로 물러난다.
 */
export const errorMessage = (error: unknown): string | undefined =>
  serverErrorMessage(error) ?? readString((error as { message?: unknown })?.message);
