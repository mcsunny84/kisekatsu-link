// 주소 꼬리표 파서와 클릭 추적. 브라우저(index.html)와 node 테스트가 함께 쓴다.
const ALLOWED = /[^a-z0-9_-]/g;

function clean(value, max) {
  return String(value ?? '').toLowerCase().replace(ALLOWED, '').slice(0, max);
}

/** location.search → { ch, c }. ch 없으면 'direct', c 없으면 ''. */
export function parseTags(search) {
  const p = new URLSearchParams(search || '');
  const ch = clean(p.get('ch'), 8);
  const c = clean(p.get('c'), 40);
  return { ch: ch || 'direct', c };
}

/** 버튼 클릭을 GA4에 보낸다. gtag가 없으면 조용히 끝낸다. 이동은 막지 않는다. */
export function trackClick(store, tags) {
  const g = globalThis.window && globalThis.window.gtag;
  if (typeof g !== 'function') return;
  try {
    g('event', 'store_click', { store, ch: tags.ch, c: tags.c, transport_type: 'beacon' });
  } catch {
    /* 분석 실패는 동선에 영향 없음 */
  }
}
