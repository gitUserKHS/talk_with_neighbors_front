import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider } from 'react-redux';
import { store } from './store';
import { theme } from './theme';
import { authService } from './services/authService';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Matching from './pages/Matching';
import ChatRoomList from './components/chat/ChatRoomList';
import ChatRoom from './components/chat/ChatRoom';
import CreateChatRoom from './components/chat/CreateChatRoom';
import Profile from './pages/Profile';
import { CircularProgress, Box } from '@mui/material';
import { setUser } from './store/slices/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/types';
import { websocketService } from './services/websocketService';
import NotificationHandler from './components/notifications/NotificationHandler';

// 세션 체크 훅
const useSessionCheck = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const userFromSession = await authService.getCurrentUser();
        console.log('세션 체크 결과 (useSessionCheck):', userFromSession);
        dispatch(setUser(userFromSession)); 
      } catch (error) {
        console.error('세션 체크 중 오류 발생 (useSessionCheck):', error);
        dispatch(setUser(null));
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [dispatch]);

  return { isLoading, isAuthenticated };
};

// 보호된 라우트 컴포넌트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useSessionCheck();
  console.log('ProtectedRoute 상태:', { isLoading, isAuthenticated });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    console.log('인증되지 않은 사용자, 로그인 페이지로 리다이렉트');
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// 인증 상태 초기화 컴포넌트
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    // 컴포넌트 마운트 시 로컬 스토리지에서 초기 사용자 정보 로드
    const initialUser = authService.getInitialUser();
    console.log('(AuthInitializer) Initial user from local storage:', initialUser);
    if (initialUser) {
      dispatch(setUser(initialUser));
    }
    setIsLoadingInitial(false);
  }, [dispatch]);

  // 사용자 상태 변화에 따른 WebSocket 관리 useEffect
  useEffect(() => {
    console.log('(AuthInitializer) User state changed:', user);
    const currentWsUserId = websocketService.getCurrentUserId(); // websocketService에 getCurrentUserId() 메소드가 있다고 가정
                                                              // 없다면 websocketService 내부의 currentUserId를 직접 참조하거나 getter를 만들어야 합니다.
                                                              // 우선은 있다고 가정하고 진행합니다.

    if (user && user.id) {
      // 사용자가 있고 ID가 존재할 때
      if (user.id !== currentWsUserId || !websocketService.getIsConnected()) {
        console.log(`(AuthInitializer) User detected (ID: ${user.id}). Current WS User ID: ${currentWsUserId}, Connected: ${websocketService.getIsConnected()}. Initializing WebSocket.`);
        // 사용자 ID가 다르거나, 연결되지 않은 경우에만 초기화 진행
        // websocketService.disconnect(); // 필요하다면 이전 연결을 명시적으로 해제
        websocketService.setCurrentUserId(user.id);
        websocketService.initialize(user.id); 
      } else {
        console.log(`(AuthInitializer) User (ID: ${user.id}) already processed or WebSocket connected. WS User ID: ${currentWsUserId}, Connected: ${websocketService.getIsConnected()}. Skipping WebSocket re-initialization.`);
      }
    } else if (!user && currentWsUserId) {
      // 사용자가 없고, 웹소켓에는 사용자 ID가 설정되어 있는 경우 (로그아웃)
      console.log(`(AuthInitializer) User logged out. Current WS User ID: ${currentWsUserId}. Disconnecting WebSocket.`);
      websocketService.setCurrentUserId(undefined);
      websocketService.disconnect();
    } else if (!user && !currentWsUserId){
      console.log('(AuthInitializer) No user and WebSocket already has no user. No action needed.');
    }

  }, [user]); // user 객체 자체가 변경될 때만 실행

  if (isLoadingInitial) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthInitializer>
          <Navbar />
          <NotificationHandler />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/matching"
              element={
                <ProtectedRoute>
                  <Matching />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatRoomList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/create"
              element={
                <ProtectedRoute>
                  <CreateChatRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:roomId"
              element={
                <ProtectedRoute>
                  <ChatRoom />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthInitializer>
      </Router>
    </ThemeProvider>
  );
};

// 메인 앱 컴포넌트
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
