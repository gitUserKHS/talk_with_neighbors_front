import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import ChatRoomList from './pages/ChatRoomList';
import ChatRoom from './pages/ChatRoom';
import CreateChatRoom from './pages/CreateChatRoom';
import Profile from './pages/Profile';
import { CircularProgress, Box } from '@mui/material';
import { setUser } from './store/slices/authSlice';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store/types';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Redux 상태가 변경될 때마다 로딩 상태 업데이트
    setIsLoading(false);
  }, [user]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AppContent: React.FC = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    // 앱 시작 시 한 번만 인증 상태 체크
    const initializeAuth = async () => {
      try {
        // 로컬 스토리지에서 사용자 정보 복원
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            dispatch(setUser(parsedUser));
            setIsInitialized(true);
            return;
          } catch (error) {
            console.error('로컬 스토리지에서 사용자 정보 복원 중 오류 발생:', error);
            localStorage.removeItem('user');
          }
        }
        
        // 로컬 스토리지에 없을 때만 API 요청
        const currentUser = await authService.getCurrentUser();
        dispatch(setUser(currentUser));
      } catch (error) {
        console.error('인증 상태 초기화 중 오류 발생:', error);
        dispatch(setUser(null));
      } finally {
        setIsInitialized(true);
      }
    };

    initializeAuth();
  }, [dispatch]);

  if (!isInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/matching"
            element={
              <PrivateRoute>
                <Matching />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <PrivateRoute>
                <ChatRoomList />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/create"
            element={
              <PrivateRoute>
                <CreateChatRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/:roomId"
            element={
              <PrivateRoute>
                <ChatRoom />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
