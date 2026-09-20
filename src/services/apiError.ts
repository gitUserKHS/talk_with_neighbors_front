/**
 * API 오류에서 사용자에게 보여줄 메시지를 꺼낸다.
 *
 * 여러 화면이 `catch (err)` 뒤에 `err.response?.data?.message`를 직접 읽는 코드를
 * 각자 반복하고 있었다. 같은 판단을 한곳에 모아 두면 catch 인자를 unknown으로 받을 수 있고,
 * 서버가 빈 문자열을 내려보내도 화면에 빈 오류가 뜨지 않는다.
 *
 * 서버 오류 본문은 `{ code: 'UPPER_SNAKE' | null, message: '한국어 문구' }` 형태다.
 * `code`가 있으면 로케일별 문구로 바꿔 보여주고, 없으면 한국어 로케일에서만 서버 문구를 그대로 쓴다.
 */

import type { Locale } from '../i18n/I18nProvider';

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

type ErrorPayload = { code?: unknown; message?: unknown };

const responseData = (error: unknown): ErrorPayload | undefined =>
  (error as { response?: { data?: ErrorPayload } })?.response?.data;

/**
 * 서버가 내려준 메시지. 백엔드가 한국어로 응답하므로 한국어 로케일에서만 쓰는 것을 전제로 한다.
 */
export const serverErrorMessage = (error: unknown): string | undefined =>
  readString(responseData(error)?.message);

/**
 * 서버가 내려준 안정적인 오류 코드. 공백을 정리하고 대문자로 맞춰 표 조회에 바로 쓸 수 있게 한다.
 */
export const errorCode = (error: unknown): string | undefined => {
  const code = readString(responseData(error)?.code);
  return code ? code.trim().toUpperCase() : undefined;
};

/**
 * 서버 메시지가 없으면 Error.message로 물러난다.
 */
export const errorMessage = (error: unknown): string | undefined =>
  serverErrorMessage(error) ?? readString((error as { message?: unknown })?.message);

/**
 * 오류 코드별 [한국어, 영어] 문구. 백엔드 `ErrorResponse.code`와 짝을 이룬다.
 */
export const CODE_MESSAGES: Record<string, readonly [string, string]> = {
  NICKNAME_CHANGE_REQUIRED: ['자동으로 생성된 닉네임과 다른 이름을 입력해 주세요.', 'Choose a nickname different from the automatically generated one.'],
  NICKNAME_INVALID: ['닉네임은 공백 없이 2자 이상 30자 이하로 입력해 주세요.', 'Enter a nickname between 2 and 30 characters without spaces.'],
  INVALID_VERIFICATION_CODE: ['인증번호가 올바르지 않습니다. 다시 확인해 주세요.', 'That verification code is incorrect. Please check it again.'],
  EMAIL_VERIFICATION_CODE_INVALID_OR_EXPIRED: ['인증번호가 올바르지 않거나 만료되었습니다. 새 번호를 받아 주세요.', 'That verification code is invalid or expired. Please request a new one.'],
  EMAIL_VERIFICATION_ATTEMPTS_EXHAUSTED: ['인증번호 입력 횟수를 초과했습니다. 새 번호를 받아 주세요.', 'Too many incorrect attempts. Please request a new code.'],
  EMAIL_VERIFICATION_RESEND_COOLDOWN: ['인증번호를 다시 받기 전 잠시 기다려 주세요.', 'Please wait before requesting another code.'],
  EMAIL_VERIFICATION_RATE_LIMITED: ['인증 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 'Too many verification requests. Please try again shortly.'],
  EMAIL_VERIFICATION_PROOF_INVALID: ['이메일 인증이 만료되었습니다. 처음부터 다시 진행해 주세요.', 'Your email verification has expired. Please start again.'],
  EMAIL_VERIFICATION_UNAVAILABLE: ['이메일 인증을 잠시 이용할 수 없습니다. 잠시 후 다시 시도해 주세요.', 'Email verification is temporarily unavailable. Please try again shortly.'],
  EMAIL_DELIVERY_FAILED: ['인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.', 'We could not send the verification email. Please try again shortly.'],
  EMAIL_VERIFICATION_EXPIRED: ['인증번호가 만료되었습니다. 새 인증번호를 받아 주세요.', 'Your verification code has expired. Please request a new one.'],
  VERIFICATION_CHALLENGE_EXPIRED: ['인증번호가 만료되었습니다. 새 인증번호를 받아 주세요.', 'Your verification code has expired. Please request a new one.'],
  EMAIL_ALREADY_IN_USE: ['이미 가입된 이메일입니다. 로그인해 주세요.', 'An account already uses this email. Please sign in.'],
  USERNAME_ALREADY_IN_USE: ['이미 사용 중인 닉네임입니다.', 'That nickname is already in use.'],
  REGISTRATION_CONFLICT: ['이미 가입된 이메일이거나 사용 중인 닉네임입니다.', 'That email or nickname is already in use.'],
  TOO_MANY_REQUESTS: ['요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', 'Too many requests. Please try again shortly.'],
  ACCOUNT_LINK_REQUIRED: ['같은 이메일로 가입한 계정이 있습니다. 기존 이메일과 비밀번호로 로그인해 주세요.', 'An account already uses this email. Please sign in with your existing email and password.'],
  PROVIDER_EMAIL_REQUIRED: ['소셜 계정의 이메일 제공에 동의해 주세요.', 'Please allow access to your social account email.'],
  OAUTH_FAILED: ['간편 로그인하지 못했습니다. 다시 시도해 주세요.', 'We could not complete social sign-in. Please try again.'],
  BAD_CREDENTIALS: ['이메일과 비밀번호를 확인해 주세요.', 'Please check your email and password.'],
  SESSION_EXPIRED: ['로그인이 만료되었습니다. 다시 로그인해 주세요.', 'Your session has expired. Please sign in again.'],
  ACCESS_DENIED: ['접근 권한이 없습니다.', 'You do not have permission to do that.'],
  FEED_POST_NOT_FOUND: ['게시글을 찾을 수 없습니다.', 'That post could not be found.'],
  FEED_BLOCKED: ['차단한 이웃의 게시글은 볼 수 없습니다.', 'Posts from a blocked neighbor are not available.'],
};

/**
 * 오류를 사용자 언어의 문구로 바꾼다. 우선순위는
 * 서버 코드에 맞는 [한국어, 영어] 문구 → 한국어 로케일이면 서버 메시지 → fallback 순이다.
 */
export const localizedApiError = (
  error: unknown,
  locale: Locale,
  fallback: string,
  codeMessages: Record<string, readonly [string, string]> = CODE_MESSAGES,
): string => {
  const code = errorCode(error);
  const pair = code ? codeMessages[code] : undefined;
  if (pair) return locale === 'ko' ? pair[0] : pair[1];
  return (locale === 'ko' ? serverErrorMessage(error) : undefined) ?? fallback;
};
