import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (relativePath: string) => readFile(
  new URL(`../${relativePath}`, import.meta.url),
  'utf8',
);

const [meetupsSource, meetupServiceSource, chatRoomSource, calendarListSource] = await Promise.all([
  readSource('src/pages/Meetups.tsx'),
  readSource('src/services/meetupService.ts'),
  readSource('src/components/chat/ChatRoom.tsx'),
  readSource('src/components/chat/schedule/ChatScheduleListDialog.tsx'),
]);

test('meetup profile mutations do not own calendar date fields', () => {
  assert.doesNotMatch(meetupsSource, /label="모임 일정"/);
  assert.doesNotMatch(meetupsSource, /label="신청 마감"/);
  assert.doesNotMatch(meetupsSource, /form\.scheduledAt|form\.registrationDeadline|form\.durationMinutes/);

  const updateBody = meetupServiceSource.match(
    /async updateMeetup[\s\S]*?api\.patch<HobbyMeetup>\([\s\S]*?\{([\s\S]*?)\n    \}\);/,
  )?.[1];
  assert.ok(updateBody, 'expected to find the meetup profile update body');
  assert.doesNotMatch(updateBody, /scheduledAt|registrationDeadline|durationMinutes/);
});

test('schedule cards are rendered only inside the meetup calendar list', () => {
  assert.doesNotMatch(chatRoomSource, /ChatScheduleUpcomingBar/);
  assert.doesNotMatch(chatRoomSource, /import ChatScheduleCard/);
  assert.match(chatRoomSource, /if \(message\.type === 'SCHEDULE'\) \{\s*return null;/);
  assert.match(
    chatRoomSource,
    /if \(incoming\.type === 'SCHEDULE'\)[\s\S]*?return;[\s\S]*?setMessages\(/,
  );
  assert.match(chatRoomSource, /aria-label=\{t\('모임 달력 보기', 'Open meetup calendar'\)\}/);
  assert.doesNotMatch(chatRoomSource, /aria-label=\{t\('약속 만들기'|채팅방 약속 만들기/);
});

test('calendar owns creation and returns to its list after schedule flows', () => {
  assert.match(calendarListSource, /\{t\('모임 달력', 'Meetup calendar'\)\}/);
  assert.match(calendarListSource, /다가오는 일정/);
  assert.match(calendarListSource, /지난 일정과 취소된 일정/);
  assert.match(calendarListSource, /upcoming\.length > 0/);
  assert.match(chatRoomSource, /setScheduleFormOpen\(false\);[\s\S]*?setScheduleListOpen\(true\);/);
  assert.match(chatRoomSource, /const closeScheduleDetails[\s\S]*?setScheduleListOpen\(true\);/);
});
