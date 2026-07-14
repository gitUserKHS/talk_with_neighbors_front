import { describe, expect, it } from 'vitest';
import { resolveMediaUrl } from './mediaUrl';

describe('resolveMediaUrl', () => {
  it('resolves backend upload paths against an external API origin', () => {
    expect(
      resolveMediaUrl(
        '/uploads/feed/photo.jpg?version=2',
        'https://api.example.com/api',
        'https://portfolio.github.io',
      ),
    ).toBe('https://api.example.com/uploads/feed/photo.jpg?version=2');

    expect(
      resolveMediaUrl(
        'uploads/avatars/neighbor.webp',
        'https://api.example.com/api/',
        'https://portfolio.github.io',
      ),
    ).toBe('https://api.example.com/uploads/avatars/neighbor.webp');
  });

  it('keeps absolute, data, blob, and unrelated paths unchanged', () => {
    const values = [
      'https://cdn.example.com/photo.jpg',
      'data:image/png;base64,abc',
      'blob:https://portfolio.github.io/asset',
      '/images/static-logo.png',
    ];

    values.forEach((value) => {
      expect(resolveMediaUrl(value, 'https://api.example.com/api')).toBe(value);
    });
  });
});
