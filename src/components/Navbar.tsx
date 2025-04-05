import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store/types';
import { setUser } from '../store/slices/authSlice';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(setUser(null));
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 중 오류 발생:', error);
    }
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component={RouterLink} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
          Talk With Neighbors
        </Typography>
        <Box>
          {user ? (
            <>
              <Button color="inherit" component={RouterLink} to="/matching">
                매칭
              </Button>
              <Button color="inherit" component={RouterLink} to="/chat">
                채팅
              </Button>
              <Button color="inherit" component={RouterLink} to="/profile">
                프로필
              </Button>
              <Button color="inherit" onClick={handleLogout}>
                로그아웃
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={RouterLink} to="/login">
                로그인
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                회원가입
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;