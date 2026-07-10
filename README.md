# 이웃톡 프런트엔드

관심사와 거리를 바탕으로 가까운 이웃을 연결하는 React 19 + Vite 애플리케이션이야.

## 시작하기

Node.js 22를 권장해.

```bash
npm ci
npm run dev
```

## 검증

```bash
npm run typecheck
npm run build
```

PR과 `main`, `codex/**` 브랜치 푸시에서는 GitHub Actions가 타입 검사와 프로덕션 빌드를 실행해. `main`에 병합되면 GitHub Pages 배포가 진행돼.

Pages 배포 전에 저장소 Variables에 `VITE_API_URL`, `VITE_SOCKET_URL`을 등록하고, Kakao 지도가 필요하면 Actions Secret에 `VITE_KAKAO_MAP_API_KEY`를 등록해줘.
