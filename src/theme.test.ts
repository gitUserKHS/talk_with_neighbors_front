import { getContrastRatio } from '@mui/material/styles';
import { describe, expect, it } from 'vitest';
import { theme } from './theme';

describe('theme accessibility', () => {
  it('keeps primary buttons readable with white text', () => {
    expect(getContrastRatio(theme.palette.primary.main, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });
});
