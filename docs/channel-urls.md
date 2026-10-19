# 채널별 주소표

바이오·설명란에는 아래 주소를 그대로 넣는다. 게시물 안에 링크를 넣을 수 있는 채널은 콘텐츠 코드(`c`)까지 붙인다.

| 채널 | 바이오/설명란 주소 | 콘텐츠별(가능 시) |
|---|---|---|
| Instagram (kise.katsu) | `https://link.kisekatsu.kr/?ch=ig` | 불가 — 게시물별은 인스타 인사이트의 링크 탭 수로 본다 |
| Threads | `https://link.kisekatsu.kr/?ch=th` | `https://link.kisekatsu.kr/?ch=th&c=YYMMDD-이름` |
| YouTube | `https://link.kisekatsu.kr/?ch=yt` | `https://link.kisekatsu.kr/?ch=yt&c=YYMMDD-이름` |
| TikTok | `https://link.kisekatsu.kr/?ch=tt` | `https://link.kisekatsu.kr/?ch=tt&c=YYMMDD-이름` (설명에 링크가 눌리는지 확인 후) |
| Naver Clip | `https://link.kisekatsu.kr/?ch=nc` | `https://link.kisekatsu.kr/?ch=nc&c=YYMMDD-이름` |
| X | `https://link.kisekatsu.kr/?ch=x` | `https://link.kisekatsu.kr/?ch=x&c=YYMMDD-이름` |
| 옛 링크트리(과도기) | `https://link.kisekatsu.kr/?ch=lt` | — |

## 콘텐츠 코드 규칙
`YYMMDD-짧은이름`. 영문 소문자·숫자·하이픈만, 40자 이내. 같은 콘텐츠를 여러 채널에 올려도 코드는 하나(채널은 `ch`가 가른다).

예: `251016-kimchinabe`, `251020-miso-vote`, `251101-hire-rank`

## 새 콘텐츠 올릴 때
1. 코드를 정한다(올리는 날짜 + 메뉴/주제).
2. 채널별 주소를 만든다: 위 표의 바이오 주소 뒤에 `&c=코드`.
3. 캡션·설명란·고정 댓글에 넣는다. 인스타는 바이오 주소 그대로.

## 교체 상태

| 채널 | 계정 | 교체일 | 확인자 | 비고 |
|---|---|---|---|---|
| Instagram | kise.katsu | 2026-10-19 | 태양 | 앱에서 교체, 공개 프로필에서 link.kisekatsu.kr/?ch=ig 확인(Claude, linktr.ee 없음) |
| Threads | @kise.katsu | 2026-10-19 | 태양 | 앱에서 교체. 프로필엔 link.kisekatsu.kr/ 로만 표시(스레드가 쿼리 생략 표시). 태양 탭 확인: ?ch=th 유지, 스레드가 utm_source=threads·fbclid를 덧붙임(무해) |
| YouTube | @kisekatsu | 2026-10-16 | Claude | 스튜디오 링크 URL 교체, 공개 채널 정보에서 확인 |
| TikTok | @kisekatsu | 2026-10-16 | Claude | 웹은 웹사이트 칸 없음 → 소개글 내 주소를 link.kisekatsu.kr/?ch=tt로 교체, 공개 프로필 확인 |
| Naver Clip | kisekatsu | 2026-10-19 | 태양 | 소개글에 https://link.kisekatsu.kr/?ch=nc 텍스트로 삽입(캡처 확인) |
| X | @kisekatsu | 2026-10-16 | Claude | 웹사이트 칸 교체, 공개 프로필 확인 |
| 링크트리(과도기 버튼) | linktr.ee/KISEKATSU | 2026-10-16 | Claude | 지점 3개 숨김, 「키세카츠 매장 안내」→?ch=lt 1개(제목은 자동 생성값 유지). 공개 페이지에서 버튼 1개 확인 |
