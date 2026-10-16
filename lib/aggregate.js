// 현황판 집계. dash/data.json({updated, views[], clicks[]})을 받아 화면용 요약을 만든다.
export const CHANNEL_NAMES = {
  ig: 'Instagram', th: 'Threads', yt: 'YouTube', tt: 'TikTok', nc: 'Naver Clip', x: 'X',
  lt: '옛 링크트리', etc: '기타', direct: '직접/미표시',
};
export const STORES = ['sinnonhyeon', 'anguk', 'sinsa'];
export const STORE_NAMES = { sinnonhyeon: '신논현', anguk: '안국', sinsa: '신사', unknown: '지점 미상' };

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

function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** from~to 사이 날짜를 전부 만들어 없는 날은 0으로 채운다. */
function fillDaily(byDate, from, to) {
  const out = [];
  if (!from || !to || from > to) return out;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push(byDate[d] || { date: d, views: 0, clicks: 0 });
  }
  return out;
}

const bag = () => Object.create(null);

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
    .map(r => ({ ...r, ch: normalize(r.ch, 'ch'), c: normalize(r.c, 'c'), store: normalize(r.store, 'store') || 'unknown', n: Number(r.n) || 0 }));

  const cross = bag();
  const chViews = bag(), chClicks = bag();
  const byContent = bag();
  const byDate = bag();

  for (const r of views) {
    chViews[r.ch] = (chViews[r.ch] || 0) + r.n;
    byDate[r.date] = byDate[r.date] || { date: r.date, views: 0, clicks: 0 };
    byDate[r.date].views += r.n;
  }
  for (const r of clicks) {
    cross[r.ch] = cross[r.ch] || bag();
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
  const dates = Object.keys(byDate).sort();
  const daily = fillDaily(byDate, from || dates[0], from ? today : dates[dates.length - 1]);

  return {
    updated: data.updated || null,
    empty: views.length === 0 && clicks.length === 0,
    cross, channels, contents, daily,
  };
}
