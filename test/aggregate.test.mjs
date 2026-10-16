import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, summarize } from '../lib/aggregate.js';
import sample from './fixtures/sample-data.json' with { type: 'json' };

test('(not set) 정규화', () => {
  assert.equal(normalize('(not set)', 'ch'), 'direct');
  assert.equal(normalize('', 'c'), '');
  assert.equal(normalize('anguk', 'store'), 'anguk');
});
test('빈 데이터는 empty', () => {
  const s = summarize({ updated: null, views: [], clicks: [] }, 7, '2026-10-16');
  assert.equal(s.empty, true); assert.deepEqual(s.channels, []);
});
test('채널×지점 교차표', () => {
  const s = summarize(sample, null, '2026-10-16');
  assert.equal(s.cross.ig.anguk, 29); assert.equal(s.cross.yt.sinsa, 3);
});
test('기간 필터 7일', () => {
  const s = summarize(sample, 7, '2026-10-16');
  assert.equal(s.daily.every(d => d.date >= '2026-10-10'), true);
});
test('채널 CTR과 정렬', () => {
  const s = summarize(sample, null, '2026-10-16');
  assert.equal(s.channels[0].ch, 'ig'); assert.ok(s.channels[0].ctr > 0 && s.channels[0].ctr <= 1);
});
test('콘텐츠 상위 목록은 c 없는 행 제외', () => {
  const s = summarize(sample, null, '2026-10-16');
  assert.ok(s.contents.every(r => r.c !== ''));
});
test('(not set) 행은 direct로 합산', () => {
  const s = summarize(sample, null, '2026-10-16');
  assert.equal(s.cross.direct.anguk, 1);
});
