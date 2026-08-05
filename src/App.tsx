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
import {
  NICKNAME_SETUP_PATH,
  nicknameSetupDestination,
  profileOnboardingDestination,
  requiredProfileSetupPath,
} from './services/profileSetup';
import Navbar from './components/Navbar';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationHandler from './components/notifications/NotificationHandler';
import { getRouterBasename } from './routerBase';
import { I18nProvider } from './i18n/I18nProvider';

const Home = React.lazy(() => import('./pages/Home'));
const Feed = React.lazy(() => import('./pages/Feed'));
const NewPost = React.lazy(() => import('./pages/NewPost'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const AuthCallback = React.lazy(() => import('./pages/AuthCallback'));
const Matching = React.lazy(() => import('./pages/Matching'));
const Meetups = React.lazy(() => import('./pages/Meetups'));
const ChatRoomList = React.lazy(() => import('./components/chat/ChatRoomList'));
const ChatRoom = React.lazy(() => import('./components/chat/ChatRoom'));
const CreateChatRoom = React.lazy(() => import('./components/chat/CreateChatRoom'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Onboarding = React.lazy(() => import('./pages/Onboarding'));
const NicknameSetup = React.lazy(() => import('./pages/NicknameSetup'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const PasswordReset = React.lazy(() => import('./pages/PasswordReset'));

const FullPageLoader = () => (
  <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
    <CircularProgress />
  </Box>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const requiredSetup = requiredProfileSetupPath(user);
  if (requiredSetup && location.pathname !== requiredSetup) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate
      to={requiredSetup === NICKNAME_SETUP_PATH
        ? nicknameSetupDestination(returnTo)
        : profileOnboardingDestination(returnTo)}
      replace
    />;
  }

  return <>{children}</>;
};

const PublicReadableRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);

  const requiredSetup = requiredProfileSetupPath(user);
  if (isAuthenticated && requiredSetup) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate
      to={requiredSetup === NICKNAME_SETUP_PATH
        ? nicknameSetupDestination(returnTo)
        : profileOnboardingDestination(returnTo)}
      replace
    />;
  }

  const accessScope = isAuthenticated
    ? `authenticated:${String(user?.id ?? 'unknown')}`
    : 'public';

  // A scope key remounts the readable page before paint when a session expires
  // or another account replaces it, clearing every piece of page-local state.
  return <React.Fragment key={accessScope}>{children}</React.Fragment>;
};

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
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
    if (user?.id && user.nicknameSetupRequired !== true) {
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

/**
 * 라우트 화면에서 난 예외가 내비게이션까지 함께 날려버리지 않도록 감싼다.
 * location.pathname을 key로 주어 다른 화면으로 이동하면 경계가 스스로 초기화된다.
 */
const RouteBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
};

const AppContent: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <ErrorBoundary>
      <Router basename={getRouterBasename(import.meta.env.BASE_URL)}>
      <AuthInitializer>
        <Navbar />
        <NotificationHandler />
        <RouteBoundary>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route
            path="/feed"
            element={
              <PublicReadableRoute>
                <Feed />
              </PublicReadableRoute>
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
              <PublicReadableRoute>
                <Meetups />
              </PublicReadableRoute>
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
            path="/onboarding"
            element={<ProtectedRoute><Onboarding /></ProtectedRoute>}
          />
          <Route
            path="/onboarding/nickname"
            element={<ProtectedRoute><NicknameSetup /></ProtectedRoute>}
          />
          <Route
            path="/notifications"
            element={<ProtectedRoute><Notifications /></ProtectedRoute>}
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </RouteBoundary>
      </AuthInitializer>
      </Router>
    </ErrorBoundary>
  </ThemeProvider>
);

const App: React.FC = () => (
  <Provider store={store}>
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  </Provider>
);

export default App;
