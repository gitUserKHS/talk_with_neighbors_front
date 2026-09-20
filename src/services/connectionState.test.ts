import { describe, expect, it } from 'vitest';
import { bannerState } from './connectionState';

const healthy = { isOnline: true, wasOffline: false, navigatorOnline: true, authenticated: true };

describe('bannerState', () => {
  it.each([
    { label: 'a healthy connection', input: healthy, expected: 'hidden' },
    {
      label: 'a dropped socket for a signed-in user',
      input: { ...healthy, isOnline: false, wasOffline: true },
      expected: 'reconnecting',
    },
    {
      label: 'the first connect still in progress',
      input: { ...healthy, isOnline: false, wasOffline: false },
      expected: 'hidden',
    },
    {
      label: 'a socket that recovered',
      input: { ...healthy, isOnline: true, wasOffline: true },
      expected: 'hidden',
    },
    {
      label: 'a dropped socket for a visitor',
      input: { ...healthy, isOnline: false, wasOffline: true, authenticated: false },
      expected: 'hidden',
    },
    {
      label: 'a device offline while signed in',
      input: { ...healthy, navigatorOnline: false },
      expected: 'offline',
    },
    {
      label: 'a device offline while signed out',
      input: { ...healthy, navigatorOnline: false, authenticated: false },
      expected: 'offline',
    },
    {
      label: 'a device offline on top of a dropped socket',
      input: { ...healthy, isOnline: false, wasOffline: true, navigatorOnline: false },
      expected: 'offline',
    },
  ])('shows $expected for $label', ({ input, expected }) => {
    expect(bannerState(input)).toBe(expected);
  });
});
