import React from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import { useI18n } from '../../i18n/I18nProvider';
import { ThemePreference, useThemeMode } from './ThemeModeProvider';

/**
 * 화면 테마 전환.
 *
 * 툴바에 두는 이유는 로그인하지 않은 사람도 되돌릴 수 있어야 하기 때문이다.
 * 계정 메뉴 안에만 있으면 로그아웃 상태에서 어두운 화면에 갇힌다.
 */
const ThemeModeToggle: React.FC = () => {
  const { t } = useI18n();
  const { preference, mode, setPreference } = useThemeMode();
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);

  const options: Array<{ value: ThemePreference; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: t('밝게', 'Light'), icon: <LightModeOutlinedIcon fontSize="small" /> },
    { value: 'dark', label: t('어둡게', 'Dark'), icon: <DarkModeOutlinedIcon fontSize="small" /> },
    { value: 'system', label: t('시스템 설정', 'System'), icon: <SettingsBrightnessOutlinedIcon fontSize="small" /> },
  ];

  const choose = (value: ThemePreference) => {
    setPreference(value);
    setAnchor(null);
  };

  return (
    <>
      <Tooltip title={t('화면 테마', 'Appearance')}>
        <IconButton
          aria-label={t('화면 테마 선택', 'Choose appearance')}
          aria-haspopup="menu"
          aria-expanded={anchor ? 'true' : undefined}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ color: 'text.secondary' }}
        >
          {mode === 'dark' ? <DarkModeOutlinedIcon fontSize="small" /> : <LightModeOutlinedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            selected={preference === option.value}
            onClick={() => choose(option.value)}
          >
            <ListItemIcon>{option.icon}</ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default ThemeModeToggle;
