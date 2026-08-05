import React from 'react';
import TranslateRoundedIcon from '@mui/icons-material/TranslateRounded';
import { Stack, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Locale, useI18n } from '../i18n/I18nProvider';

interface LanguageSwitcherProps {
  compact?: boolean;
  inverted?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ compact = false, inverted = false }) => {
  const { locale, setLocale, t } = useI18n();

  const handleChange = (_event: React.MouseEvent<HTMLElement>, nextLocale: Locale | null) => {
    if (nextLocale) setLocale(nextLocale);
  };

  const color = inverted ? 'rgba(255,255,255,.86)' : 'text.secondary';
  const borderColor = inverted ? 'rgba(255,255,255,.22)' : 'divider';

  return (
    <Tooltip title={t('언어 선택', 'Choose language')}>
      <Stack
        direction="row"
        spacing={0.5}
        alignItems="center"
        aria-label={t('언어 선택', 'Choose language')}
        sx={{ color }}
      >
        {!compact && <TranslateRoundedIcon sx={{ fontSize: 18 }} aria-hidden="true" />}
        <ToggleButtonGroup
          exclusive
          size="small"
          value={locale}
          onChange={handleChange}
          sx={{
            '& .MuiToggleButton-root': {
              minWidth: compact ? 36 : 40,
              height: 30,
              px: compact ? 0.75 : 1,
              borderColor,
              color,
              fontSize: '0.72rem',
              fontWeight: 800,
              '&.Mui-selected': {
                // 선택 상태는 배경 틴트로 드러난다. 글자까지 같은 색을 쓰면 대비가 사라진다.
                color: inverted ? '#213D3A' : 'text.primary',
                bgcolor: inverted
                  ? '#fff'
                  : (theme) => alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.10),
              },
            },
          }}
        >
          <ToggleButton value="ko" aria-label={t('한국어로 전환', 'Switch to Korean')}>KO</ToggleButton>
          <ToggleButton value="en" aria-label={t('영어로 전환', 'Switch to English')}>EN</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Tooltip>
  );
};

export default LanguageSwitcher;
