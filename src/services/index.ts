export { default as api } from './api';
export * from './authService';
export * from './chatService';
export * from './matchingService';
export * from './feedService';

export const useMockServices = import.meta.env.VITE_USE_MOCK_SERVICES === 'true';
