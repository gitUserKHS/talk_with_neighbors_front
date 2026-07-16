import React from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { useI18n } from '../../i18n/I18nProvider';

interface SignOutDialogProps {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const SignOutDialog: React.FC<SignOutDialogProps> = ({
  open,
  busy = false,
  error,
  onClose,
  onConfirm,
}) => {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      aria-labelledby="logout-confirm-title"
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="logout-confirm-title">{t('로그아웃하시겠습니까?', 'Sign out?')}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">
          {t('이 기기에서 로그인 상태가 해제됩니다.', 'You will be signed out on this device.')}
        </Typography>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button disabled={busy} onClick={onClose}>{t('취소', 'Cancel')}</Button>
        <Button color="error" variant="contained" disabled={busy} onClick={onConfirm}>
          {busy ? t('로그아웃 중…', 'Signing out…') : t('로그아웃', 'Sign out')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SignOutDialog;
