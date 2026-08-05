import React from 'react';
import { Box, ListItemIcon, ListItemText, MenuItem, ToggleButton, ToggleButtonGroup } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { useI18n } from '../../i18n/I18nProvider';
import { ThemePreference, useThemeMode } from './ThemeModeProvider';

/**
 * 계정 메뉴 안에 놓는 테마 선택. 메뉴가 닫히지 않도록 클릭을 삼킨다.
 */
const ThemeModeMenuItem: React.FC = () => {
  const { t } = useI18n();
  const { preference, setPreference } = useThemeMode();

  const handleChange = (_event: React.MouseEvent<HTMLElement>, next: ThemePreference | null) => {
    if (next) setPreference(next);
  };

  return (
    <MenuItem
      disableRipple
      onClick={(event) => event.stopPropagation()}
      sx={{ cursor: 'default', '&:hover': { bgcolor: 'transparent' }, alignItems: 'flex-start', py: 1 }}
    >
      <ListItemIcon><DarkModeOutlinedIcon fontSize="small" /></ListItemIcon>
      <Box sx={{ minWidth: 0 }}>
        <ListItemText primary={t('화면 테마', 'Appearance')} sx={{ mb: 0.75 }} />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={preference}
          onChange={handleChange}
          aria-label={t('화면 테마 선택', 'Choose appearance')}
          sx={{
            '& .MuiToggleButton-root': {
              px: 1,
              height: 28,
              fontSize: '0.7rem',
              fontWeight: 800,
              textTransform: 'none',
            },
          }}
        >
          <ToggleButton value="light" aria-label={t('밝게', 'Light')}>{t('밝게', 'Light')}</ToggleButton>
          <ToggleButton value="dark" aria-label={t('어둡게', 'Dark')}>{t('어둡게', 'Dark')}</ToggleButton>
          <ToggleButton value="system" aria-label={t('시스템 설정', 'System')}>{t('시스템', 'System')}</ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </MenuItem>
  );
};

export default ThemeModeMenuItem;
