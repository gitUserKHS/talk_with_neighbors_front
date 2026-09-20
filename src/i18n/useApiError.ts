import { useCallback } from 'react';
import { useI18n } from './I18nProvider';
import { localizedApiError } from '../services/apiError';

/**
 * 화면의 `catch (err)`에서 사용자 언어에 맞는 오류 문구를 만든다.
 *
 * 서버가 내려준 오류 코드가 있으면 코드별 [한국어, 영어] 문구를, 없으면 한국어 로케일에서만
 * 서버 메시지를, 그마저 없으면 화면이 넘긴 (ko, en) 기본 문구를 쓴다.
 * 예전에는 `(locale === 'ko' ? serverErrorMessage(err) : undefined) ?? t(ko, en)`를
 * 화면마다 복사해 썼다.
 */
export const useApiError = () => {
  const { locale, t } = useI18n();
  return useCallback(
    (error: unknown, korean: string, english: string): string =>
      localizedApiError(error, locale, t(korean, english)),
    [locale, t],
  );
};
