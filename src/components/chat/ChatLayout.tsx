import React from 'react';
import { Box } from '@mui/material';
import ChatRoomList from './ChatRoomList';
import { Outlet } from 'react-router-dom';

const ChatLayout: React.FC = () => {
  return (
    <Box sx={{ height: 'calc(100vh - 64px)', p: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
        gap: 2,
        height: '100%'
      }}>
        <Box sx={{ 
          width: { xs: '100%', md: '33.33%' },
          height: '100%'
        }}>
          <ChatRoomList />
        </Box>
        <Box sx={{ 
          width: { xs: '100%', md: '66.67%' },
          height: '100%'
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default ChatLayout; 