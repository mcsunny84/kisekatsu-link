// 현황판 집계. dash/data.json({updated, views[], clicks[]})을 받아 화면용 요약을 만든다.
export const CHANNEL_NAMES = {
  ig: 'Instagram', th: 'Threads', yt: 'YouTube', tt: 'TikTok', nc: 'Naver Clip', x: 'X',
  lt: '옛 링크트리', etc: '기타', direct: '직접/미표시',
};
export const STORES = ['sinnonhyeon', 'anguk', 'sinsa'];
export const STORE_NAMES = { sinnonhyeon: '신논현', anguk: '안국', sinsa: '신사' };

const UNSET = new Set(['(not set)', '', undefined, null]);

/** GA4의 (not set)·빈 값을 정리한다. ch는 'direct', c·store는 ''. */
export function normalize(value, kind) {
  if (UNSET.has(value)) return kind === 'ch' ? 'direct' : '';
  return String(value);
}

function cutoff(days, today) {
  if (!days) return '';
  const d = new Date(today + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - (days - 1));
  return d.toISOString().slice(0, 10);
}

function inRange(row, from) {
  return !from || row.date >= from;
}

/**
 * @param {{updated:string|null, views:Array, clicks:Array}} data
 * @param {number|null} days  null이면 전체
 * @param {string} today 'YYYY-MM-DD'
 */
export function summarize(data, days, today) {
  const from = cutoff(days, today);
  const views = (data.views || []).filter(r => inRange(r, from))
    .map(r => ({ ...r, ch: normalize(r.ch, 'ch'), c: normalize(r.c, 'c'), n: Number(r.n) || 0 }));
  const clicks = (data.clicks || []).filter(r => inRange(r, from))
    .map(r => ({ ...r, ch: normalize(r.ch, 'ch'), c: normalize(r.c, 'c'), store: normalize(r.store, 'store'), n: Number(r.n) || 0 }));

  const cross = {};
  const chViews = {}, chClicks = {};
  const byContent = {};
  const byDate = {};

  for (const r of views) {
    chViews[r.ch] = (chViews[r.ch] || 0) + r.n;
    byDate[r.date] = byDate[r.date] || { date: r.date, views: 0, clicks: 0 };
    byDate[r.date].views += r.n;
  }
  for (const r of clicks) {
    cross[r.ch] = cross[r.ch] || {};
    cross[r.ch][r.store] = (cross[r.ch][r.store] || 0) + r.n;
    chClicks[r.ch] = (chClicks[r.ch] || 0) + r.n;
    byDate[r.date] = byDate[r.date] || { date: r.date, views: 0, clicks: 0 };
    byDate[r.date].clicks += r.n;
    if (r.c) {
      const key = r.c + '|' + r.ch;
      byContent[key] = byContent[key] || { c: r.c, ch: r.ch, clicks: 0 };
      byContent[key].clicks += r.n;
    }
  }

  const chs = new Set([...Object.keys(chViews), ...Object.keys(chClicks)]);
  const channels = [...chs].map(ch => {
    const v = chViews[ch] || 0, k = chClicks[ch] || 0;
    return { ch, views: v, clicks: k, ctr: v ? k / v : 0 };
  }).sort((a, b) => b.clicks - a.clicks || b.views - a.views);

  const contents = Object.values(byContent).sort((a, b) => b.clicks - a.clicks).slice(0, 20);
  const daily = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

  return {
    updated: data.updated || null,
    empty: views.length === 0 && clicks.length === 0,
    cross, channels, contents, daily,
  };
}
