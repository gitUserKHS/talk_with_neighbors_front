# 이웃톡 프런트엔드

[![Frontend CI](https://github.com/gitUserKHS/talk_with_neighbors_front/actions/workflows/ci.yml/badge.svg)](https://github.com/gitUserKHS/talk_with_neighbors_front/actions/workflows/ci.yml)

관심사와 거리를 바탕으로 가까운 이웃을 연결하는 React 19 + Vite 애플리케이션이야.

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

## 공개 둘러보기

로그인하지 않아도 `/feed`에서 작성자가 공개 미리보기에 동의한 게시글을 읽고, `/meetups`에서 공개 모임을 검색하고 둘러볼 수 있어. 댓글 확인과 작성, 좋아요, 글·모임 생성, 모임 참여, 매칭, 채팅과 안전 관리 동작은 로그인이 필요해.

## 검증

```bash
npm test
npm run typecheck
npm run build
```

PR과 `main`, `codex/**`, `agent/**` 브랜치 푸시에서는 GitHub Actions가 테스트, 같은 출처(`/api`, `/ws`) 프로덕션 빌드, Nginx 컨테이너 헬스 체크를 실행해.

GitHub Pages는 백엔드 공개 주소를 직접 입력해야만 실행되는 수동 미리보기야. `main`과 버전 태그의 GHCR 이미지는 같은 품질 검증을 모두 통과한 뒤에만 게시되며, 실제 AWS 배포는 별도 배포 워크플로가 담당해.

게시글·채팅 미디어는 같은 출처의 `/uploads` 경로로 요청하고, 백엔드가 실행 환경에 따라 로컬 볼륨 또는 비공개 S3에서 제공해.
