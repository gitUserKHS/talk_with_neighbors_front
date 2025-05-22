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
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        console.log('세션 체크 결과:', user);
        if (user) {
          dispatch(setUser(user));
        } else {
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('세션 체크 중 오류 발생:', error);
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
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        console.log('세션 체크 결과:', user);
        if (user) {
          dispatch(setUser(user));
        } else {
          dispatch(setUser(null));
        }
      } catch (error) {
        console.error('세션 체크 중 오류 발생:', error);
        dispatch(setUser(null));
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [dispatch]);

  if (isLoading) {
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
