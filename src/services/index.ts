// 실제 서비스
export { default as api } from './api';
export * from './authService';
export * from './chatService';
export * from './matchingService';
export * from './socketService';

// 모의 서비스 (개발 환경에서만 사용)
export * from './mock/auth';
export * from './mock/chat';
export * from './mock/socket';

// 모의 서비스 사용 여부를 환경 변수로 제어
const USE_MOCK_SERVICES = process.env.REACT_APP_USE_MOCK_SERVICES === 'true';

// 모의 서비스를 사용할 경우 실제 서비스를 모의 서비스로 대체
if (USE_MOCK_SERVICES) {
  console.log('모의 서비스를 사용합니다.');
  const mockAuth = require('./mock/auth').mockAuthService;
  const mockChat = require('./mock/chat').mockChatService;
  const mockSocket = require('./mock/socket').mockSocketService;

  module.exports = {
    ...module.exports,
    authService: mockAuth,
    chatService: mockChat,
    socketService: mockSocket,
  };
}