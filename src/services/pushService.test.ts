import { describe, expect, it } from 'vitest';
import { decodeBase64Url } from './pushService';

describe('decodeBase64Url', () => {
  it('decodes a padded base64url string', () => {
    // 'hello' in base64 is aGVsbG8=
    const decoded = decodeBase64Url('aGVsbG8');
    expect(Array.from(decoded)).toEqual([104, 101, 108, 108, 111]);
  });

  it('translates the url-safe alphabet back before decoding', () => {
    // 0xFB 0xFF encodes to +/8= in standard base64 and -_8 in base64url.
    const decoded = decodeBase64Url('-_8');
    expect(Array.from(decoded)).toEqual([251, 255]);
  });

  it('produces the 65 byte key length a VAPID public key uses', () => {
    const vapidLike = 'B'.repeat(87);
    expect(decodeBase64Url(vapidLike)).toHaveLength(65);
  });
});
