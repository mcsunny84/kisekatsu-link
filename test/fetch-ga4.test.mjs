import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRows, buildData } from '../scripts/fetch-ga4.mjs';

const viewsReport = {
  dimensionHeaders: [{ name: 'date' }, { name: 'customEvent:ch' }, { name: 'customEvent:c' }],
  metricHeaders: [{ name: 'eventCount' }],
  rows: [{ dimensionValues: [{ value: '20261016' }, { value: 'ig' }, { value: '(not set)' }], metricValues: [{ value: '5' }] }],
};
const clicksReport = {
  dimensionHeaders: [{ name: 'date' }, { name: 'customEvent:ch' }, { name: 'customEvent:c' }, { name: 'customEvent:store' }],
  metricHeaders: [{ name: 'eventCount' }],
  rows: [{ dimensionValues: [{ value: '20261016' }, { value: 'yt' }, { value: '251016-x' }, { value: 'anguk' }], metricValues: [{ value: '2' }] }],
};

test('views 행 변환, (not set) 보존', () => {
  assert.deepEqual(toRows(viewsReport, 'views'), [{ date: '2026-10-16', ch: 'ig', c: '(not set)', n: 5 }]);
});
test('clicks 행 변환에 store 포함', () => {
  assert.deepEqual(toRows(clicksReport, 'clicks'), [{ date: '2026-10-16', ch: 'yt', c: '251016-x', store: 'anguk', n: 2 }]);
});
test('rows 없으면 빈 배열', () => {
  assert.deepEqual(toRows({ dimensionHeaders: [], metricHeaders: [] }, 'views'), []);
});
test('buildData는 ISO updated', () => {
  const d = buildData(viewsReport, clicksReport, new Date('2026-10-17T00:10:00Z'));
  assert.equal(d.updated, '2026-10-17T00:10:00.000Z');
  assert.equal(d.views.length, 1); assert.equal(d.clicks.length, 1);
});

import { runReportAll } from '../scripts/fetch-ga4.mjs';

test('runReportAll은 rowCount까지 페이지를 이어 받음', async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    const body = JSON.parse(opts.body); calls.push(body.offset || 0);
    const page = (body.offset || 0) === 0
      ? { rowCount: 3, rows: [{ dimensionValues: [{ value: '20261016' }, { value: 'ig' }, { value: '' }], metricValues: [{ value: '1' }] }, { dimensionValues: [{ value: '20261016' }, { value: 'th' }, { value: '' }], metricValues: [{ value: '1' }] }] }
      : { rowCount: 3, rows: [{ dimensionValues: [{ value: '20261016' }, { value: 'yt' }, { value: '' }], metricValues: [{ value: '1' }] }] };
    return { ok: true, json: async () => ({ dimensionHeaders: [{ name: 'date' }, { name: 'customEvent:ch' }, { name: 'customEvent:c' }], metricHeaders: [{ name: 'eventCount' }], ...page }) };
  };
  const report = await runReportAll('tok', '123', 'page_view', [], { fetchImpl: fakeFetch, pageSize: 2 });
  assert.equal(report.rows.length, 3);
  assert.deepEqual(calls, [0, 2]);
});
test('빈 보고서도 rows 배열', async () => {
  const fakeFetch = async () => ({ ok: true, json: async () => ({ dimensionHeaders: [], metricHeaders: [], rowCount: 0 }) });
  const report = await runReportAll('tok', '123', 'store_click', ['customEvent:store'], { fetchImpl: fakeFetch });
  assert.deepEqual(report.rows, []);
});
