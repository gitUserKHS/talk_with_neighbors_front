import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pickerSource = await readFile(
  new URL('../src/components/MapLocationPicker.tsx', import.meta.url),
  'utf8',
);

test('map search cannot submit a surrounding meetup form', () => {
  assert.doesNotMatch(pickerSource, /component="form"/);
  assert.doesNotMatch(pickerSource, /type="submit"/);
  assert.match(pickerSource, /<Box role="search" aria-label="장소 또는 주소 검색">/);
  assert.match(pickerSource, /type="button"\s+onClick=\{handleSearch\}/);
});

test('Enter runs only the map search and does not bubble to a surrounding form', () => {
  assert.match(pickerSource, /onKeyDown=\{handleSearchKeyDown\}/);

  const handler = pickerSource.match(
    /const handleSearchKeyDown = \(event: React\.KeyboardEvent\) => \{([\s\S]*?)\n  \};/,
  )?.[1];

  assert.ok(handler, 'expected a dedicated map-search keyboard handler');
  assert.match(handler, /event\.key !== 'Enter'/);
  assert.match(handler, /event\.preventDefault\(\)/);
  assert.match(handler, /event\.stopPropagation\(\)/);
  assert.match(handler, /event\.nativeEvent\.isComposing/);
  assert.match(handler, /event\.repeat/);
  assert.match(handler, /handleSearch\(\)/);

  const preventDefaultAt = handler.indexOf('event.preventDefault()');
  const stopPropagationAt = handler.indexOf('event.stopPropagation()');
  const composingGuardAt = handler.indexOf('event.nativeEvent.isComposing');
  assert.ok(preventDefaultAt < composingGuardAt, 'IME Enter must be prevented before search is skipped');
  assert.ok(stopPropagationAt < composingGuardAt, 'IME Enter must not reach the surrounding form');
});

test('repeated Enter presses do not spend duplicate Kakao search requests', () => {
  assert.match(pickerSource, /const searchInFlight = useRef\(false\)/);
  assert.match(pickerSource, /if \(searchInFlight\.current\) return;/);
  assert.match(pickerSource, /searchInFlight\.current = true;/);
  assert.ok((pickerSource.match(/searchInFlight\.current = false;/g) ?? []).length >= 2);
});

test('all picker actions are explicit non-submit buttons', () => {
  const buttonTypes = pickerSource.match(/type="button"/g) ?? [];
  assert.equal(buttonTypes.length, 4);
});

test('manual fallback fields cannot submit the surrounding meetup form', () => {
  const fallbackGuards = pickerSource.match(/onKeyDown=\{preventParentSubmitOnEnter\}/g) ?? [];
  assert.equal(fallbackGuards.length, 2);
  assert.match(
    pickerSource,
    /const preventParentSubmitOnEnter[\s\S]*?event\.preventDefault\(\);[\s\S]*?event\.stopPropagation\(\);/,
  );
});
