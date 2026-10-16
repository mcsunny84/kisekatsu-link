# GA4 설정 기록

- 계정: 키세카츠 (412267596) — 2026-10-16 생성, 태양 Google 계정
- 속성: 키세카츠 링크 (559250506), 대한민국 / KRW, 업종 식음료
- 웹 스트림: 키세카츠 링크 페이지, https://link.kisekatsu.kr, 스트림 ID 16139667095, 측정 ID G-V3YTDHC1MZ
- 향상된 측정: 기본값 유지(이탈 클릭도 자동 기록되지만 현황판은 store_click만 본다)
- 데이터 공유: "비즈니스를 위한 추천" 끔
- 커스텀 디멘션(이벤트 범위): ch(채널), c(콘텐츠), store(지점) — 2026-10-16 생성 확인
- 데이터 보관: 14개월
- GitHub Secrets: GA4_PROPERTY_ID, GA4_SA_JSON (값은 기록하지 않음)
- Google Cloud 프로젝트: kisekatsu-link, Analytics Data API 사용 설정, 서비스 계정 dash-reader@kisekatsu-link.iam.gserviceaccount.com (GA 속성 뷰어). 키 JSON은 Secrets 등록 후 로컬 파일 삭제(2026-10-16)
- 첫 수동 실행(2026-10-16 14:02 KST): 인증·보고서 호출 성공, 0행(집계 지연). 현황판 배포 성공
- 검증: 내장 브라우저로 ?ch=etc&c=251016-test 열어 page_view(ep.ch=etc, ep.c=251016-test) 전송 확인
