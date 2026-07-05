import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';
import { store } from './store';
import { theme } from './theme';
import { RootState } from './store/types';
import { setUser } from './store/slices/authSlice';
import { authService } from './services/authService';
import { websocketService } from './services/websocketService';
import Navbar from './components/Navbar';
import NotificationHandler from './components/notifications/NotificationHandler';
import Home from './pages/Home';
import Feed from './pages/Feed';
import NewPost from './pages/NewPost';
import Login from './pages/Login';
import Register from './pages/Register';
import Matching from './pages/Matching';
import ChatRoomList from './components/chat/ChatRoomList';
import ChatRoom from './components/chat/ChatRoom';
import CreateChatRoom from './components/chat/CreateChatRoom';
import Profile from './pages/Profile';

const FullPageLoader = () => (
  <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const initialUser = authService.getInitialUser();
      if (initialUser) {
        dispatch(setUser(initialUser));
      }

      try {
        const sessionUser = await authService.getCurrentUser();
        if (isMounted) {
          dispatch(setUser(sessionUser));
        }
      } catch {
        if (isMounted) {
          dispatch(setUser(null));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (user?.id) {
      websocketService.setCurrentUserId(user.id);
      websocketService.initialize(user.id);
      return;
    }

    websocketService.setCurrentUserId(undefined);
    websocketService.disconnect();
  }, [user]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  return <>{children}</>;
};

const AppContent: React.FC = () => (
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
            path="/feed"
            element={
              <ProtectedRoute>
                <Feed />
              </ProtectedRoute>
            }
          />
          <Route
            path="/post/new"
            element={
              <ProtectedRoute>
                <NewPost />
              </ProtectedRoute>
            }
          />
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

const App: React.FC = () => (
  <Provider store={store}>
    <AppContent />
  </Provider>
);

export default App;
