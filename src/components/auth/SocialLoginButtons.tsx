import React, { useEffect, useState } from 'react';
import { Alert, Button, CircularProgress, Divider, Stack } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import ChatBubbleRoundedIcon from '@mui/icons-material/ChatBubbleRounded';
import { authService } from '../../services/authService';
import { startOAuthLogin } from '../../services/authNavigation';
import type { AuthProviderConfig, AuthProviderId } from '../../types/auth';

interface SocialLoginButtonsProps {
  returnTo: string;
  label?: string;
}

const providerIcon = (provider: AuthProviderId) => (
  provider === 'google' ? <GoogleIcon /> : <ChatBubbleRoundedIcon />
);

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  returnTo,
  label = '또는 간편하게 계속하기',
}) => {
  const [providers, setProviders] = useState<AuthProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    authService.getAuthProviders()
      .then((configured) => {
        if (mounted) setProviders(configured.filter((provider) => provider.enabled));
      })
      .catch(() => {
        if (mounted) setError(true);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Stack alignItems="center" aria-label="간편 로그인 확인 중">
        <CircularProgress size={22} />
      </Stack>
    );
  }

  if (error) {
    return <Alert severity="info">간편 로그인은 잠시 사용할 수 없어. 이메일로 계속해줘.</Alert>;
  }

  if (providers.length === 0) return null;

  return (
    <Stack spacing={1.25}>
      <Divider>{label}</Divider>
      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="outlined"
          fullWidth
          size="large"
          startIcon={providerIcon(provider.id)}
          onClick={() => startOAuthLogin(provider.id, returnTo)}
          sx={provider.id === 'kakao' ? {
            minHeight: 48,
            color: '#191919',
            bgcolor: '#FEE500',
            borderColor: '#FEE500',
            '&:hover': { bgcolor: '#F5DC00', borderColor: '#F5DC00' },
          } : { minHeight: 48 }}
        >
          {provider.displayName}로 계속하기
        </Button>
      ))}
    </Stack>
  );
};

export default SocialLoginButtons;
