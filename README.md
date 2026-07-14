# 이웃톡 프런트엔드

[![Frontend CI](https://github.com/gitUserKHS/talk_with_neighbors_front/actions/workflows/ci.yml/badge.svg)](https://github.com/gitUserKHS/talk_with_neighbors_front/actions/workflows/ci.yml)

관심사와 거리를 바탕으로 가까운 이웃을 연결하는 React 19 + Vite 애플리케이션이야.

**라이브 서비스:** [https://talk-with-neighbors.duckdns.org](https://talk-with-neighbors.duckdns.org)

## 시작하기

Node.js 22를 권장해.

```bash
npm ci
npm run dev
```

백엔드 저장소를 이 저장소와 같은 상위 폴더에 clone하면, 백엔드 저장소에 포함된 Compose 파일로 전체 스택을 실행할 수 있어.

```bash
cd ../talk_with_neighbors_back
docker compose -f compose.local.yml up --build -d
```

브라우저는 `http://localhost:3000`, 백엔드 API는 `http://localhost:8080`에서 확인해. 종료는 백엔드 저장소에서 `docker compose -f compose.local.yml down`을 실행하면 돼.

### 카카오 지도 장소 선택

모임 생성 화면의 장소 검색·지도 클릭 선택을 사용하려면 `.env.example`을 참고해
`VITE_KAKAO_MAP_JAVASCRIPT_KEY`를 설정해. 카카오디벨로퍼스 앱에서 **카카오맵 사용 설정을 켜고**,
`[앱 > 플랫폼 키 > JavaScript 키 > JavaScript SDK 도메인]`에 로컬 주소와 운영 origin
`https://talk-with-neighbors.duckdns.org`를 각각 등록해야 해. 지도 SDK에는 REST API 키나 어드민 키를
사용하지 않아.

JavaScript 키는 브라우저에서 지도 SDK를 호출하기 위한 플랫폼 키라 빌드 결과에서 숨길 수 없어.
키를 소스에 직접 커밋하지 말고 로컬 환경 변수와 GitHub
`VITE_KAKAO_MAP_JAVASCRIPT_KEY` 시크릿으로 주입하며, 등록 도메인 제한을 유지해.
키가 없는 개발·PR 빌드에서는 좌표 없이 장소명과 안내 주소를 입력하는 대체 UI가 표시돼.
프로필·온보딩의 `현재 위치 사용`은 브라우저 보안 정책상 HTTPS 또는 localhost에서만 동작하므로,
실제 배포에서는 TLS가 적용된 등록 도메인으로 접속해야 해.

- [카카오맵 시작하기](https://developers.kakao.com/docs/ko/kakaomap/common)
- [Kakao 지도 Web API 가이드](https://apis.map.kakao.com/web/guide/)

## 공개 둘러보기

로그인하지 않아도 `/feed`에서 작성자가 공개 미리보기에 동의한 게시글을 읽고, `/meetups`에서 공개 모임을 검색하고 둘러볼 수 있어. 댓글 확인과 작성, 좋아요, 글·모임 생성, 모임 참여, 매칭, 채팅과 안전 관리 동작은 로그인이 필요해.

## 검증

```bash
npm test
npm run typecheck
npm run build
```

PR과 `main`, `codex/**`, `agent/**` 브랜치 푸시에서는 GitHub Actions가 테스트, 같은 출처(`/api`, `/ws`) 프로덕션 빌드, Nginx 컨테이너 헬스 체크를 실행해.

로그인 세션은 `SameSite=Lax` HttpOnly 쿠키를 사용하므로 프런트와 API를 같은 사이트에서 제공해야 해.
별도 `github.io` 출처에서 API를 호출하던 Pages 미리보기는 이 계약과 맞지 않아 제거했고, 포트폴리오
라이브 서비스는 AWS의 같은 출처(`/api`, `/ws`) 배포를 기준으로 해. `main`과 버전 태그의 GHCR 이미지는
같은 품질 검증을 모두 통과한 뒤에만 게시되며, 실제 AWS 배포는 별도 배포 워크플로가 담당해.

게시글·채팅 미디어는 같은 출처의 `/uploads` 경로로 요청하고, 백엔드가 실행 환경에 따라 로컬 볼륨 또는 비공개 S3에서 제공해.
