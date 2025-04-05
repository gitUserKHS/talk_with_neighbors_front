import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { authService } from './services/authService';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ChatRoomList from './pages/ChatRoomList';
import ChatRoom from './pages/ChatRoom';
import CreateChatRoom from './pages/CreateChatRoom';
import Matching from './pages/Matching';

// Components
import Navbar from './components/Navbar';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  return authService.isAuthenticated() ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" replace />
  );
};

const App: React.FC = () => {
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
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/chat/rooms"
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
            path="/matching"
            element={
              <PrivateRoute>
                <Matching />
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
