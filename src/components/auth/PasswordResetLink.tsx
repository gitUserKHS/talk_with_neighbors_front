import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nProvider';
import passwordResetService from '../../services/passwordResetService';

/**
 * 서버에 메일 발송 수단이 준비되었을 때만 나타난다.
 * 눌러도 아무것도 할 수 없는 링크를 두면 계정을 잃은 사용자를 두 번 실망시킨다.
 */
const PasswordResetLink: React.FC = () => {
  const { t } = useI18n();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    passwordResetService.isAvailable().then((enabled) => {
      if (active) setAvailable(enabled);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!available) return null;

  return (
    <Box sx={{ textAlign: 'right' }}>
      <Button component={RouterLink} to="/password-reset" size="small" sx={{ minHeight: 0, p: 0.5 }}>
        {t('비밀번호를 잊으셨나요?', 'Forgot your password?')}
      </Button>
    </Box>
  );
};

export default PasswordResetLink;
