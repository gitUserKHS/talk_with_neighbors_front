# 이웃톡 프런트엔드

관심사와 거리를 바탕으로 가까운 이웃을 연결하는 React 19 + Vite 애플리케이션이야.

## 시작하기

Node.js 22를 권장해.

```bash
npm ci
npm run dev
```

전체 스택은 상위 폴더에서 한 명령으로 실행할 수 있어.

```bash
docker compose up --build -d
```

브라우저는 `http://localhost:3000`, 백엔드 API는 `http://localhost:8080`에서 확인해. 종료는 상위 폴더에서 `docker compose down`을 실행하면 돼.

## 검증

```bash
npm run typecheck
npm run build
```

PR과 `main`, `codex/**` 브랜치 푸시에서는 GitHub Actions가 타입 검사와 프로덕션 빌드를 실행해.

현재 프로젝트는 로컬 전용이야. GitHub Pages와 GHCR 이미지 게시 워크플로는 수동 비활성화 상태이며, CI는 Nginx 기반 컨테이너 빌드까지만 검증해.

게시글 미디어는 같은 출처의 `/uploads` 경로를 통해 백엔드 로컬 저장소에서 제공돼.
