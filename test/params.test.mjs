import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTags, trackClick } from '../lib/params.js';

test('없으면 direct, 빈 c', () => assert.deepEqual(parseTags(''), { ch: 'direct', c: '' }));
test('정상 꼬리표', () => assert.deepEqual(parseTags('?ch=yt&c=251016-kimchinabe'), { ch: 'yt', c: '251016-kimchinabe' }));
test('대문자는 소문자로', () => assert.equal(parseTags('?ch=IG').ch, 'ig'));
test('허용 외 문자 제거', () => assert.equal(parseTags('?ch=<script>').ch, 'script'));
test('ch 8자·c 40자 제한', () => {
  const r = parseTags('?ch=' + 'a'.repeat(20) + '&c=' + 'b'.repeat(60));
  assert.equal(r.ch.length, 8); assert.equal(r.c.length, 40);
});
test('빈 ch는 direct', () => assert.equal(parseTags('?ch=&c=x').ch, 'direct'));
test('gtag 없으면 예외 없이 반환', () => {
  globalThis.window = {}; assert.doesNotThrow(() => trackClick('anguk', { ch: 'ig', c: '' }));
});
test('gtag 있으면 store_click 전송', () => {
  const calls = []; globalThis.window = { gtag: (...a) => calls.push(a) };
  trackClick('sinsa', { ch: 'th', c: '251016-x' });
  assert.deepEqual(calls[0], ['event', 'store_click', { store: 'sinsa', ch: 'th', c: '251016-x', transport_type: 'beacon' }]);
});
