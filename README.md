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

PR과 `main`, `codex/**` 브랜치 푸시에서는 GitHub Actions가 타입 검사와 프로덕션 빌드를 실행해. `main`에 병합되면 GitHub Pages 배포가 진행돼.

CI는 Nginx 기반 프로덕션 컨테이너 빌드도 검증해. `main` 또는 `v*` 태그가 푸시되면 동일한 이미지를 GHCR에도 게시해.

Pages 배포 전에 저장소 Variables에 `VITE_API_URL`, `VITE_SOCKET_URL`을 등록하고, Kakao 지도가 필요하면 Actions Secret에 `VITE_KAKAO_MAP_API_KEY`를 등록해줘.
