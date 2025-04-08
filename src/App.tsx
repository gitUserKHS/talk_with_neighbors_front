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

// 세션 체크 훅
const useSessionCheck = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 이미 Redux에 사용자 정보가 있으면 세션 체크
        if (user) {
          const currentUser = await authService.getCurrentUser();
          if (currentUser) {
            setIsAuthenticated(true);
          } else {
            // 세션이 유효하지 않으면 로그아웃 처리
            dispatch(setUser(null));
            setIsAuthenticated(false);
          }
        } else {
          // Redux에 사용자 정보가 없으면 로컬 스토리지 확인
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            try {
              const parsedUser = JSON.parse(storedUser);
              dispatch(setUser(parsedUser));
              setIsAuthenticated(true);
            } catch (error) {
              console.error('로컬 스토리지에서 사용자 정보 복원 중 오류 발생:', error);
              localStorage.removeItem('user');
              setIsAuthenticated(false);
            }
          } else {
            // 로컬 스토리지에도 없으면 API 요청
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
              setIsAuthenticated(true);
            } else {
              setIsAuthenticated(false);
            }
          }
        }
      } catch (error) {
        console.error('세션 체크 중 오류 발생:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [dispatch, user]);

  return { isLoading, isAuthenticated };
};

// 보호된 라우트 컴포넌트
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useSessionCheck();

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    // 현재 경로를 state로 전달하여 로그인 후 돌아올 수 있도록 함
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// 인증 상태 초기화 컴포넌트
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const dispatch = useDispatch();
  const { isLoading } = useSessionCheck();

  useEffect(() => {
    if (!isLoading) {
      setIsInitialized(true);
    }
  }, [isLoading]);

  if (!isInitialized) {
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
