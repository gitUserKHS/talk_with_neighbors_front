import React, { Suspense, useEffect, useState } from 'react';
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

const Home = React.lazy(() => import('./pages/Home'));
const Feed = React.lazy(() => import('./pages/Feed'));
const NewPost = React.lazy(() => import('./pages/NewPost'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Matching = React.lazy(() => import('./pages/Matching'));
const Meetups = React.lazy(() => import('./pages/Meetups'));
const ChatRoomList = React.lazy(() => import('./components/chat/ChatRoomList'));
const ChatRoom = React.lazy(() => import('./components/chat/ChatRoom'));
const CreateChatRoom = React.lazy(() => import('./components/chat/CreateChatRoom'));
const Profile = React.lazy(() => import('./pages/Profile'));

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
        <Suspense fallback={<FullPageLoader />}>
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
            path="/meetups"
            element={
              <ProtectedRoute>
                <Meetups />
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
        </Suspense>
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
