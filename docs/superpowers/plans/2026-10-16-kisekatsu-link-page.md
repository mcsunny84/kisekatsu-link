# 키세카츠 링크 페이지 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 링크트리를 대체하는 한 장짜리 링크 페이지(`https://link.kisekatsu.kr/`)와, 채널×지점 클릭을 보여 주는 한국어 현황판(`/dash/`)을 비용 0원으로 올린다.

**Architecture:** GitHub Pages 정적 사이트 한 저장소. 링크 페이지는 주소 꼬리표(`ch`, `c`)를 읽어 GA4에 `page_view`·`store_click` 이벤트를 보낸다. 현황판은 GitHub Actions가 매일 GA4 Data API로 뽑아 커밋한 `dash/data.json`만 읽어 브라우저에서 집계한다. 순수 로직(꼬리표 파싱, 집계)은 ES 모듈로 분리해 `node --test`로 검증한다.

**Tech Stack:** HTML/CSS/vanilla JS(ES module), Node 24 (`node:test`), GA4(gtag.js + Data API `runReport`), GitHub Pages·Actions, 가비아 DNS.

**Spec:** `docs/superpowers/specs/2026-10-16-kisekatsu-link-page-design.md`

## Global Constraints

- 비용 0원. 새 서비스 가입 없음(GitHub mcsunny84·Google mcsunny84@gmail.com 계정 안에서만).
- 외부 폰트·라이브러리 없음. gtag.js만 외부 스크립트. 분석이 막혀도 버튼은 일반 `<a href>`로 동작.
- 버튼 3개, 순서 고정: 신논현 `https://naver.me/5UVwGmuo` / 안국역 `https://naver.me/G1m1aYFf` / 신사역 `https://naver.me/FfeO1eh0`. 라벨: 「키세카츠 신논현점」「키세카츠 안국역점」「키세카츠 신사역점」.
- 한 줄 문구: 「가까운 매장을 골라 위치·메뉴를 확인하세요」. 맨 아래 작은 `kisekatsu.kr` 링크.
- 꼬리표: `ch` ∈ {ig, th, yt, tt, nc, x, lt, etc}, 없으면 `direct`. `c` = `YYMMDD-짧은이름`(예 `251016-kimchinabe`). `store` ∈ {sinnonhyeon, anguk, sinsa}.
- GA4 이벤트: `page_view`(매개변수 ch, c), `store_click`(store, ch, c). 커스텀 디멘션 3개(ch, c, store) 이벤트 범위. 데이터 보존 14개월.
- 라이트/다크 모두, 폰 폭 우선, 가로 스크롤 없음. UI 문구 한국어.
- 네이버 플레이스 홈페이지 칸·kisekatsu-home 저장소는 건드리지 않는다. 키 값은 채팅·일지·저장소에 적지 않는다(GitHub Secrets만).
- 계정이 필요한 단계(DNS·GA4·GCP·바이오)는 태양 크롬에서 하되 단계마다 승인 후 진행. 비밀번호 입력 금지.
- 각 코드 작업은 끝에 Codex 리뷰(`codex:codex-rescue` 에이전트)를 받고 지적을 반영한 뒤 다음으로 간다.

## Review Focus

1. 꼬리표 값이 이상할 때(`?ch=IG`, `?ch=<script>`, 60자 `c`) — 소문자화·허용 문자만·길이 제한, 페이지는 정상 표시. → Task 1 테스트.
2. 광고 차단으로 gtag가 안 뜰 때 — 버튼 클릭이 막히거나 지연되지 않음. → Task 1 테스트(gtag 미정의 시 핸들러가 예외 없이 끝남).
3. GA4가 매개변수 없는 행을 `(not set)`으로 줄 때 — 집계에서 ch는 `direct`, c는 빈 값으로 합쳐짐. → Task 4 테스트.
4. `data.json`이 없거나 비었을 때 — 현황판이 빈 화면이 아니라 "아직 데이터 없음"과 갱신 시각을 보여 줌. → Task 4 테스트 + Task 5 화면 확인.
5. 인스타 앱 내장 브라우저(WebView)에서 바이오 링크 → 버튼 → 플레이스 앱/페이지 도착. → Task 7 실기기 확인(자동 테스트 불가, 수동 절차 고정).

---

### Task 1: 저장소·링크 페이지·꼬리표 파서

**Files:**
- Create: `index.html`, `lib/params.js`, `test/params.test.mjs`, `assets/favicon.svg`(kisekatsu.kr의 favicon.svg 복사), `CNAME`(내용 `link.kisekatsu.kr`), `.gitignore`, `README.md`(한 문단: 역할·꼬리표 규칙·현황판 주소), `package.json`(`"type":"module"`, `"scripts":{"test":"node --test"}`)
- Test: `test/params.test.mjs`

**Interfaces:**
- Produces: `parseTags(search: string): {ch: string, c: string}` — `search`는 `location.search`. 규칙: 소문자화, 허용 문자 `[a-z0-9_-]`만 남김, `ch` 최대 8자·없거나 빈 값이면 `'direct'`, `c` 최대 40자·없으면 `''`.
- Produces: `trackClick(store: string, tags: {ch,c}): void` — `window.gtag`가 없으면 아무것도 안 하고 반환. 있으면 `gtag('event','store_click',{store, ch, c, transport_type:'beacon'})`. `preventDefault` 절대 호출하지 않음.
- Produces: `index.html`의 버튼 `<a data-store="sinnonhyeon|anguk|sinsa" href=...>`.

- [ ] **Step 1: 실패하는 테스트 작성** `test/params.test.mjs`

```js
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
```

- [ ] **Step 2: 실패 확인** — Run: `cd C:/Users/ephra/Dev/kisekatsu-link && npm test` → Expected: FAIL (`Cannot find module '../lib/params.js'`).

- [ ] **Step 3: `lib/params.js` 구현** — `parseTags`, `trackClick` 위 시그니처대로. `URLSearchParams` 사용.

- [ ] **Step 4: 테스트 통과 확인** — Run: `npm test` → Expected: 8 pass.

- [ ] **Step 5: `index.html` 작성** — `<head>`: charset, viewport, `<title>키세카츠 매장 안내</title>`, `theme-color`, favicon, `og:title`·`og:description`(한 줄 문구). GA4 스니펫: `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX">` + 인라인 `gtag('config','G-XXXXXXXXXX',{send_page_view:false})`. `<script type="module">`: `parseTags(location.search)` → `gtag('event','page_view',{ch,c})`(gtag 있을 때만), 각 `a[data-store]`에 `click` 리스너로 `trackClick(dataset.store, tags)`. 본문: favicon.svg 로고(72px) + `<h1>키세카츠</h1>` + 한 줄 문구 + 버튼 3개(네이버 초록 `#03C75A` 원형 N 아이콘은 인라인 SVG) + 하단 `kisekatsu.kr` 링크. CSS 인라인, `prefers-color-scheme: dark` 대응, 최대 폭 480px, 버튼 높이 56px. `G-XXXXXXXXXX`는 Task 3에서 교체.

- [ ] **Step 6: 로컬 화면 확인** — `.claude/launch.json`에 `{"name":"link","runtimeExecutable":"npx","runtimeArgs":["serve","-l","4173","."],"port":4173}` 추가(또는 `python -m http.server 4173`). `preview_start` → `/?ch=ig&c=251016-test` 열어 read_page로 버튼 3개·문구 확인, 콘솔에 gtag 404 외 오류 없음, `resize_window mobile`·`colorScheme dark`로 가로 넘침 없음 캡처.

- [ ] **Step 7: 커밋·저장소 생성·Pages 켜기**

```bash
cd C:/Users/ephra/Dev/kisekatsu-link && git init -b main && git add -A && git commit -m "feat: 링크 페이지 1판 + 꼬리표 파서"
gh repo create mcsunny84/kisekatsu-link --public --source=. --push
gh api -X POST repos/mcsunny84/kisekatsu-link/pages -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'
```
확인: `gh api repos/mcsunny84/kisekatsu-link/pages -q .status` 가 `built`가 될 때까지 재확인, `curl -sI https://mcsunny84.github.io/kisekatsu-link/` → 200 또는 CNAME 때문에 301(정상).

- [ ] **Step 8: Codex 리뷰** — `codex:codex-rescue` 에이전트에 저장소 경로·스펙 경로를 주고 `index.html`·`lib/params.js` 리뷰 요청(정확성·접근성·WebView 호환). 지적 반영 후 `npm test` 재실행·커밋 `fix: Codex 리뷰 반영(1)`.

---

### Task 2: DNS — `link.kisekatsu.kr` 연결

**Files:** 없음(외부 설정). 기록: `README.md`에 DNS 한 줄 추가.

- [ ] **Step 1: 승인 요청** — 태양에게 "가비아 DNS에 `link` CNAME → `mcsunny84.github.io` 한 줄 추가" 승인받기.
- [ ] **Step 2: 가비아 DNS 입력** — 태양 크롬(claude-in-chrome)에서 가비아 My가비아 → kisekatsu.kr DNS 관리 → 레코드 추가(타입 CNAME, 호스트 `link`, 값 `mcsunny84.github.io.`, TTL 기본). 저장 전 화면 캡처로 값 확인 후 저장. 로그인이 안 되어 있으면 태양이 로그인.
- [ ] **Step 3: 전파 확인** — Run: `nslookup -type=CNAME link.kisekatsu.kr ns1.gabia.co.kr` → `mcsunny84.github.io`. 이후 `gh api -X PUT repos/mcsunny84/kisekatsu-link/pages -f cname=link.kisekatsu.kr -F https_enforced=true`(인증서 발급 전이면 `https_enforced`는 발급 후 재시도).
- [ ] **Step 4: HTTPS 확인** — Run: `curl -sI https://link.kisekatsu.kr/` → `HTTP/2 200`. 내장 브라우저로 열어 버튼 3개 보이는지 확인. 인증서 발급은 최대 1시간 걸릴 수 있음.
- [ ] **Step 5: 커밋** — README에 DNS 줄 추가, `git commit -m "docs: DNS 설정 기록"`, `git push`.

---

### Task 3: GA4 속성·커스텀 디멘션·측정 ID 반영

**Files:**
- Modify: `index.html`(`G-XXXXXXXXXX` → 실제 측정 ID 2곳)
- Create: `docs/ga4-setup.md`(속성 이름·스트림·디멘션 이름만, ID 외 키 없음)

- [ ] **Step 1: 승인 요청** — "태양 구글 계정으로 GA4 속성 『키세카츠 링크』를 만들고 웹 스트림 link.kisekatsu.kr 등록" 승인.
- [ ] **Step 2: GA4 속성 생성** — 크롬에서 analytics.google.com → 관리 → 속성 만들기(이름 `키세카츠 링크`, 시간대 Seoul, 통화 KRW) → 웹 스트림 `https://link.kisekatsu.kr` → 측정 ID(`G-…`) 복사.
- [ ] **Step 3: 커스텀 디멘션 3개** — 관리 → 맞춤 정의 → 이벤트 범위로 `ch`, `c`, `store` 생성(표시 이름 채널/콘텐츠/지점). 데이터 설정 → 데이터 보관 → 14개월.
- [ ] **Step 4: 측정 ID 반영·배포** — `index.html` 2곳 교체, `npm test`, `git commit -m "feat: GA4 측정 ID 연결"`, `git push`. Pages 반영 확인 `curl -s https://link.kisekatsu.kr/ | grep -c "G-"` → 2.
- [ ] **Step 5: 실시간 확인** — 내장 브라우저로 `https://link.kisekatsu.kr/?ch=etc&c=251016-test` 열고 안국 버튼 클릭. 크롬 GA4 실시간 보고서에서 `page_view`와 `store_click`이 보이고, 이벤트 매개변수에 `ch=etc`, `store=anguk`이 찍히는지 확인(디멘션 반영은 최대 24~48시간 지연될 수 있으니 실시간 화면의 이벤트 매개변수 칸으로 확인). 캡처 1장 저장.
- [ ] **Step 6: `docs/ga4-setup.md` 작성·커밋** — 속성·스트림·디멘션 이름, 보관 기간, 확인 날짜. `git commit -m "docs: GA4 설정 기록"`.

---

### Task 4: 집계 모듈·현황판 페이지

**Files:**
- Create: `lib/aggregate.js`, `test/aggregate.test.mjs`, `dash/index.html`, `dash/data.json`(초기값 `{"updated":null,"views":[],"clicks":[]}`), `test/fixtures/sample-data.json`

**Interfaces:**
- Consumes: `dash/data.json` 스키마(Task 5가 생성) — `{ updated: ISO문자열|null, views: [{date:'YYYY-MM-DD', ch, c, n}], clicks: [{date, ch, c, store, n}] }`.
- Produces: `normalize(v: string, kind: 'ch'|'c'|'store'): string` — `'(not set)'`·`''`·`undefined` → ch는 `'direct'`, c·store는 `''`.
- Produces: `summarize(data, days: number|null, today: string): Summary` — `days`가 null이면 전체. `Summary = { updated, empty: boolean, cross: {[ch]: {[store]: number}}, channels: [{ch, views, clicks, ctr}](clicks 내림차순), contents: [{c, ch, clicks}](상위 20), daily: [{date, views, clicks}](날짜 오름차순) }`. `ctr = views ? clicks/views : 0`.

- [ ] **Step 1: 실패하는 테스트 작성** `test/aggregate.test.mjs`

```js
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
```
`test/fixtures/sample-data.json`: 2026-10-05~10-16 사이 views 8행·clicks 8행. ig/anguk 합 29, yt/sinsa 합 3, `(not set)` 포함 행 1개, `c` 있는 행 2개(`251010-kimchinabe` yt, `251012-miso` th)를 포함하도록 만든다.

- [ ] **Step 2: 실패 확인** — `npm test` → FAIL (`aggregate.js` 없음).
- [ ] **Step 3: `lib/aggregate.js` 구현** — 위 시그니처. 날짜 비교는 문자열 비교(`YYYY-MM-DD`)로.
- [ ] **Step 4: 통과 확인** — `npm test` → 14 pass.
- [ ] **Step 5: `dash/index.html` 작성** — `<script type="module">`로 `../lib/aggregate.js` import, `fetch('./data.json', {cache:'no-store'})`. 상단: 제목 「키세카츠 링크 현황판」, 갱신 시각(`updated`를 `YYYY-MM-DD HH:mm` KST), 기간 버튼 3개(7일/30일/전체, 기본 30일, `localStorage`에 기억·try/catch). 순서대로 ① 채널×지점 교차표(행 채널·열 지점 3개+합계, 숫자 없는 칸은 `·`) ② 채널별 표(채널/조회/클릭/클릭률 %) ③ 콘텐츠 코드별 상위 20 ④ 일별 추이(인라인 SVG 선 2개, 라이브러리 없음). `empty`면 표 대신 「아직 데이터 없음. 바이오 교체 뒤 하루 지나면 보입니다.」. 교차표 아래 안내 한 줄: 「인스타 릴스는 캡션에 링크를 못 넣어 콘텐츠별은 인스타 인사이트에서 보세요.」 채널 코드는 표시용 한국어 이름 매핑(ig→Instagram, th→Threads, yt→YouTube, tt→TikTok, nc→Naver Clip, x→X, lt→옛 링크트리, etc→기타, direct→직접/미표시). 모든 값은 `textContent`로만 넣는다.
- [ ] **Step 6: 화면 확인** — `dash/data.json`을 잠시 fixture 내용으로 바꿔 preview에서 교차표에 29·3이 보이는지 read_page로 확인, 빈 JSON으로 되돌려 「아직 데이터 없음」 확인, 모바일 폭·다크 캡처. 되돌린 뒤 커밋.
- [ ] **Step 7: 커밋** — `git commit -m "feat: 집계 모듈 + 현황판 페이지"`, `git push`. `https://link.kisekatsu.kr/dash/` 200 확인.
- [ ] **Step 8: Codex 리뷰** — `lib/aggregate.js`·`dash/index.html` 리뷰(집계 정확성·XSS·빈 데이터). 반영 후 `fix: Codex 리뷰 반영(2)`.

---

### Task 5: GA4 Data API 갱신 스크립트·자동 실행

**Files:**
- Create: `scripts/fetch-ga4.mjs`, `test/fetch-ga4.test.mjs`, `.github/workflows/update-dash.yml`
- Modify: `dash/data.json`(스크립트 산출), `README.md`(수동 실행법)

**Interfaces:**
- Consumes: 환경변수 `GA4_PROPERTY_ID`(숫자), `GA4_SA_JSON`(서비스 계정 키 JSON 문자열). 둘 다 GitHub Secrets.
- Produces: `toRows(report: GA4RunReportResponse, kind: 'views'|'clicks'): Row[]` — GA4 `rows[].dimensionValues/metricValues`를 Task 4 스키마 행으로. `(not set)`은 그대로 두고 `normalize`는 현황판 쪽에서(원자료 보존).
- Produces: `buildData(viewsReport, clicksReport, now: Date): DataJson`.
- Produces: `dash/data.json` 갱신 + 변경 시에만 커밋.

- [ ] **Step 1: 실패하는 테스트** `test/fetch-ga4.test.mjs` — `toRows`에 GA4 응답 모양의 작은 객체(차원 `date`=`20261016`, `customEvent:ch`=`ig`, `customEvent:c`=`(not set)`, 지표 `eventCount`=`5`) 넣어 `[{date:'2026-10-16', ch:'ig', c:'(not set)', n:5}]` 기대. clicks는 `customEvent:store` 포함. `buildData`가 `updated`를 ISO로 넣는지. 빈 `rows` → `[]`.
- [ ] **Step 2: 실패 확인** — `npm test` → FAIL.
- [ ] **Step 3: `scripts/fetch-ga4.mjs` 구현** — 외부 패키지 없이: 서비스 계정 JSON으로 JWT(RS256, `node:crypto`) 만들어 `https://oauth2.googleapis.com/token`에서 액세스 토큰 → `https://analyticsdata.googleapis.com/v1beta/properties/{id}:runReport` 두 번(기간 `2026-10-16`~`today`, views: dimensions date·customEvent:ch·customEvent:c, filter eventName=page_view; clicks: +customEvent:store, eventName=store_click; metric eventCount) → `buildData` → `dash/data.json` 쓰기. `import.meta.url` 기준 실행 시에만 main 수행(테스트에서 import해도 네트워크 안 탐).
- [ ] **Step 4: 통과 확인** — `npm test` → 모두 pass.
- [ ] **Step 5: 승인 요청** — "Google Cloud 콘솔에서 프로젝트 `kisekatsu-link` 생성, Analytics Data API 켜기, 서비스 계정 키 1개 발급, 그 계정을 GA4 속성에 뷰어로 추가, 키를 GitHub Secrets에 등록" 승인.
- [ ] **Step 6: GCP·GA4 권한** — 크롬에서 console.cloud.google.com: 프로젝트 생성 → API 라이브러리 "Google Analytics Data API" 사용 → IAM 서비스 계정 `dash-reader` 생성 → 키(JSON) 다운로드(다운로드 자체는 태양 승인) → GA4 관리 → 속성 액세스 관리 → 그 서비스 계정 이메일을 뷰어로 추가. 키 파일은 Secrets 등록 후 즉시 삭제, 내용은 어디에도 적지 않음.
- [ ] **Step 7: Secrets 등록** — `gh secret set GA4_PROPERTY_ID --repo mcsunny84/kisekatsu-link --body "<숫자>"`, `gh secret set GA4_SA_JSON --repo mcsunny84/kisekatsu-link < 키파일경로`. 그 뒤 키 파일 삭제.
- [ ] **Step 8: 워크플로** `.github/workflows/update-dash.yml` — `schedule: cron '10 15 * * *'`(KST 00:10) + `workflow_dispatch`. steps: checkout, setup-node 24, `node scripts/fetch-ga4.mjs`(env 두 개), `git diff --quiet dash/data.json || (git config user.name/email → commit "chore: 현황판 데이터 갱신" → push)`. `permissions: contents: write`.
- [ ] **Step 9: 수동 실행·확인** — `gh workflow run update-dash.yml`, `gh run watch` → success. `git pull` 후 `dash/data.json`에 `updated`가 오늘 날짜, Task 3 Step 5의 테스트 클릭이 `clicks`에 보이는지 확인(디멘션 지연 시 다음날 재확인하고 그 사실을 기록). 현황판 `https://link.kisekatsu.kr/dash/`에서 숫자 표시 확인.
- [ ] **Step 10: 커밋·Codex 리뷰** — `git commit -m "feat: GA4 갱신 스크립트 + 일일 워크플로"`, push. Codex 리뷰(JWT 서명·토큰 만료·실패 시 종료 코드·시크릿 노출 여부). 반영 후 `fix: Codex 리뷰 반영(3)`.

---

### Task 6: 채널별 주소표·바이오 교체 체크리스트 문서

**Files:**
- Create: `docs/channel-urls.md`

- [ ] **Step 1: 주소표 작성** — 채널별 바이오 주소와 캡션용 콘텐츠 주소 예시:

| 채널 | 바이오/설명란 주소 | 콘텐츠별(가능 시) |
|---|---|---|
| Instagram | `https://link.kisekatsu.kr/?ch=ig` | 불가(인사이트 사용) |
| Threads | `?ch=th` | `?ch=th&c=YYMMDD-이름` |
| YouTube | `?ch=yt` | `?ch=yt&c=…` |
| TikTok | `?ch=tt` | `?ch=tt&c=…`(설명 링크 가능 여부 확인 후) |
| Naver Clip | `?ch=nc` | `?ch=nc&c=…` |
| X | `?ch=x` | `?ch=x&c=…` |
| 옛 링크트리 | `?ch=lt` | — |

콘텐츠 코드 규칙·예시 3개, 「새 콘텐츠 올릴 때」 절차 3줄(코드 정하기 → 주소 만들기 → 캡션에 넣기). 교체 상태 표(채널/계정/교체일/확인자) 빈 칸.
- [ ] **Step 2: 커밋** — `git commit -m "docs: 채널별 주소표"`, push.

---

### Task 7: 실기기 검증 → 링크트리 과도기 → 바이오 교체 → 기록

**Files:**
- Modify: `docs/channel-urls.md`(교체 상태 표 채움)
- 외부: 링크트리 관리 화면, 각 채널 설정, 옵시디언 일지·현황판

- [ ] **Step 1: 실기기 검증(태양 폰)** — 태양에게 요청: 인스타 앱에서 `https://link.kisekatsu.kr/?ch=ig` 열기(DM으로 자기에게 보내 탭) → 신논현 버튼 → 네이버 플레이스 도착 여부와 걸린 시간 답변. Claude는 크롬 GA4 실시간에서 `ch=ig`·`store=sinnonhyeon` 확인·캡처. 실패 시 원인 수정 전 다음 단계 금지.
- [ ] **Step 2: 링크트리 과도기 버튼** — 승인 후 크롬 `linktr.ee/admin/links`에서 지점 버튼 3개를 숨기고 버튼 1개 「키세카츠 매장 보기」→ `https://link.kisekatsu.kr/?ch=lt` 추가. 공개 페이지 `linktr.ee/KISEKATSU`에서 버튼 1개 확인.
- [ ] **Step 3: 바이오 교체(채널마다 승인)** — 순서 Instagram(kise.katsu) → Threads → YouTube → TikTok → Naver Clip → X. 각각: 현재 바이오 링크 캡처 → 새 주소로 교체 → 저장 → 공개 프로필에서 새 주소 확인 → `docs/channel-urls.md` 상태 표에 날짜 기록. 로그인 안 된 채널은 태양이 로그인. 교체 못 한 채널은 사유와 함께 표에 남김.
- [ ] **Step 4: 다음날 확인** — 교체 다음날 워크플로 실행 후 현황판에 `ig`·`th` 등 실제 채널 행이 생겼는지 확인·캡처.
- [ ] **Step 5: 기록** — `git commit -m "docs: 바이오 교체 기록"`, push. 옵시디언 `10 Projects/작업 일지/YYYY-MM-DD.md`에 `## 키세카츠 링크 페이지 — Claude HH:MM` 블록(한 일·결정·막힘→조치·다음·확인 상태), 현황판에 행 추가(주소·현황판 주소·교체 상태·다음). 메모리에 프로젝트 포인터 저장.
