// GA4 Data API에서 링크 페이지 이벤트를 뽑아 dash/data.json으로 쓴다.
// 환경변수: GA4_PROPERTY_ID(숫자), GA4_SA_JSON(서비스 계정 키 JSON 문자열). 외부 패키지 없음.
import { createSign } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const START_DATE = '2026-10-16';

function fmtDate(yyyymmdd) {
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

/** GA4 runReport 응답 → data.json 행. (not set)은 그대로 둔다(정규화는 현황판 몫). */
export function toRows(report, kind) {
  const dims = (report.dimensionHeaders || []).map(h => h.name);
  const out = [];
  for (const r of report.rows || []) {
    const d = Object.fromEntries(dims.map((name, i) => [name, r.dimensionValues[i]?.value ?? '']));
    const row = {
      date: fmtDate(d.date || ''),
      ch: d['customEvent:ch'] ?? '',
      c: d['customEvent:c'] ?? '',
    };
    if (kind === 'clicks') row.store = d['customEvent:store'] ?? '';
    row.n = Number(r.metricValues?.[0]?.value) || 0;
    out.push(row);
  }
  return out;
}

export function buildData(viewsReport, clicksReport, now = new Date()) {
  return {
    updated: now.toISOString(),
    views: toRows(viewsReport, 'views'),
    clicks: toRows(clicksReport, 'clicks'),
  };
}

// ---- 아래는 실행 시에만 ----
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function accessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const sig = b64url(signer.sign(sa.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claims}.${sig}` }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  return (await res.json()).access_token;
}

/** runReport를 offset으로 끝까지 받아 rows를 합친다. fetchImpl·pageSize는 테스트용. */
export async function runReportAll(token, propertyId, eventName, extraDims, { fetchImpl = fetch, pageSize = 100000 } = {}) {
  const rows = [];
  let offset = 0, headers = null, rowCount = 0;
  for (let page = 0; page < 50; page++) {
    const body = {
      dateRanges: [{ startDate: START_DATE, endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'customEvent:ch' }, { name: 'customEvent:c' }, ...extraDims.map(name => ({ name }))],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { matchType: 'EXACT', value: eventName } } },
      limit: pageSize,
      offset,
    };
    const res = await fetchImpl(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`runReport ${eventName} ${res.status}`);
    const json = await res.json();
    headers = headers || { dimensionHeaders: json.dimensionHeaders || [], metricHeaders: json.metricHeaders || [] };
    rows.push(...(json.rows || []));
    rowCount = Number(json.rowCount) || 0;
    offset += pageSize;
    if (rows.length >= rowCount || !(json.rows || []).length) break;
  }
  return { ...headers, rowCount, rows };
}

async function main() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const saJson = process.env.GA4_SA_JSON;
  if (!propertyId || !saJson) throw new Error('GA4_PROPERTY_ID, GA4_SA_JSON 환경변수가 필요합니다');
  let sa;
  try { sa = JSON.parse(saJson); } catch { throw new Error('GA4_SA_JSON이 올바른 JSON이 아닙니다'); }
  if (!sa.client_email || !sa.private_key) throw new Error('GA4_SA_JSON에 client_email/private_key가 없습니다');
  const token = await accessToken(sa);
  const [views, clicks] = await Promise.all([
    runReportAll(token, propertyId, 'page_view', []),
    runReportAll(token, propertyId, 'store_click', ['customEvent:store']),
  ]);
  const data = buildData(views, clicks, new Date());
  const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dash/data.json');
  await writeFile(out, JSON.stringify(data, null, 1) + '\n');
  console.log(`dash/data.json: views ${data.views.length}행, clicks ${data.clicks.length}행`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err.message); process.exit(1); });
}
