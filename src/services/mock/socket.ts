import { Message, ChatRoom, User } from '../../store/types';
import { users, responses, errors } from './data';
import { v4 as uuidv4 } from 'uuid';

// 환경 변수 설정
const config = {
  networkDelay: Number(process.env.REACT_APP_MOCK_NETWORK_DELAY) || 300,
  poorNetworkDelay: Number(process.env.REACT_APP_MOCK_POOR_NETWORK_DELAY) || 2000,
  errorRate: Number(process.env.REACT_APP_MOCK_ERROR_RATE) || 0.1,
  responseRate: Number(process.env.REACT_APP_MOCK_RESPONSE_RATE) || 0.7,
  matchSuccessRate: Number(process.env.REACT_APP_MOCK_MATCH_SUCCESS_RATE) || 0.6,
  enableLogs: process.env.REACT_APP_ENABLE_MOCK_LOGS === 'true',
};

class MockSocketService {
  private static instance: MockSocketService;
  private messageHandlers: ((message: Message) => void)[] = [];
  private matchHandlers: ((user: User) => void)[] = [];
  private roomUpdateHandlers: ((room: ChatRoom) => void)[] = [];
  private errorHandlers: ((error: Error) => void)[] = [];
  private statusHandlers: ((status: string) => void)[] = [];
  private connected = false;
  private matchingEnabled = false;
  private currentRoomId: string | null = null;
  private networkQuality: 'good' | 'poor' | 'offline' = 'good';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  private constructor() {
    // private constructor to prevent direct construction calls
  }

  public static getInstance(): MockSocketService {
    if (!MockSocketService.instance) {
      MockSocketService.instance = new MockSocketService();
    }
    return MockSocketService.instance;
  }

  // 네트워크 품질 시뮬레이션
  private simulateNetworkIssues() {
    setInterval(() => {
      if (this.connected) {
        const rand = Math.random();
        if (rand < 0.1) { // 10% 확률로 연결 끊김
          this.networkQuality = 'offline';
          this.handleDisconnect();
        } else if (rand < 0.3) { // 20% 확률로 불안정한 연결
          this.networkQuality = 'poor';
          this.emitStatus('불안정한 연결');
        } else {
          this.networkQuality = 'good';
        }
      }
    }, 30000); // 30초마다 체크
  }

  private log(...args: any[]) {
    if (config.enableLogs) {
      console.log('[MockSocket]', ...args);
    }
  }

  connect() {
    if (Math.random() < config.errorRate) {
      this.emitError(new Error(errors.socket.connectionError));
      return;
    }

    this.connected = true;
    this.emitStatus('연결됨');
    this.log('모의 소켓 연결됨');
    this.simulateNetworkIssues();
  }

  private async handleDisconnect() {
    this.connected = false;
    this.emitStatus('연결 끊김');
    console.log('모의 소켓 연결 끊김');

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.emitStatus(`재연결 시도 중... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (Math.random() > 0.3) { // 70% 확률로 재연결 성공
        this.connected = true;
        this.emitStatus('재연결 성공');
        this.reconnectAttempts = 0;
      } else {
        this.emitError(new Error(errors.socket.connectionError));
      }
    } else {
      this.emitError(new Error('최대 재연결 시도 횟수를 초과했습니다.'));
    }
  }

  disconnect() {
    this.connected = false;
    this.matchingEnabled = false;
    this.currentRoomId = null;
    this.emitStatus('연결 종료');
    console.log('모의 소켓 연결 종료');
  }

  // 채팅방 관련 메서드
  joinRoom(roomId: string) {
    if (!this.connected) {
      this.emitError(new Error(errors.socket.disconnected));
      return;
    }
    
    if (Math.random() < 0.1) { // 10% 확률로 입장 실패
      this.emitError(new Error(errors.chat.invalidParticipant));
      return;
    }
    
    this.currentRoomId = roomId;
    this.emitStatus(`채팅방 ${roomId} 입장`);
    
    // 입장 메시지 발송
    setTimeout(() => {
      this.emitSystemMessage(roomId, '채팅방에 입장했습니다.');
      
      // 50% 확률로 다른 참가자의 입장 메시지
      if (Math.random() > 0.5) {
        setTimeout(() => {
          const otherUser = users.find(u => u.id !== '1' && u.id !== 'system');
          if (otherUser) {
            this.emitSystemMessage(roomId, `${otherUser.username}님이 입장했습니다.`);
          }
        }, 2000);
      }
    }, 1000);
  }

  leaveRoom(roomId: string) {
    if (!this.connected) {
      this.emitError(new Error(errors.socket.disconnected));
      return;
    }
    
    if (this.currentRoomId === roomId) {
      this.currentRoomId = null;
      this.emitSystemMessage(roomId, '채팅방에서 퇴장했습니다.');
    }
    this.emitStatus(`채팅방 ${roomId} 퇴장`);
  }

  sendMessage(roomId: string, content: string) {
    if (!this.connected) {
      this.emitError(new Error(errors.socket.disconnected));
      return;
    }

    if (this.networkQuality === 'poor' && Math.random() < config.errorRate * 3) {
      this.emitError(new Error('메시지 전송에 실패했습니다.'));
      return;
    }
    
    const newMessage: Message = {
      id: uuidv4(),
      roomId,
      senderId: '1',
      content,
      createdAt: new Date().toISOString(),
    };
    
    const delay = this.networkQuality === 'poor' ? 
      config.poorNetworkDelay + Math.random() * config.poorNetworkDelay : 
      config.networkDelay;
    
    setTimeout(() => {
      this.messageHandlers.forEach(handler => handler(newMessage));
      
      if (Math.random() < config.responseRate) {
        setTimeout(() => {
          this.simulateResponse(roomId);
        }, config.networkDelay + Math.random() * config.networkDelay);
      }
    }, delay);
  }

  // 매칭 관련 메서드
  startMatching() {
    if (!this.connected) {
      this.emitError(new Error(errors.socket.disconnected));
      return;
    }
    
    this.matchingEnabled = true;
    this.emitStatus('매칭 시작');
    
    let matchFound = false;
    let attempts = 0;
    const maxAttempts = 3;
    
    const findMatch = () => {
      if (!this.matchingEnabled) return;
      
      attempts++;
      this.emitStatus(`매칭 시도 중... (${attempts}/${maxAttempts})`);
      
      if (Math.random() < config.matchSuccessRate) {
        matchFound = true;
        this.simulateMatchFound();
      } else if (attempts < maxAttempts) {
        setTimeout(findMatch, config.poorNetworkDelay);
      } else {
        this.matchingEnabled = false;
        this.emitStatus('매칭 실패');
        this.emitError(new Error('매칭 상대를 찾을 수 없습니다.'));
      }
    };
    
    setTimeout(findMatch, config.networkDelay);
  }

  stopMatching() {
    if (!this.connected) {
      this.emitError(new Error(errors.socket.disconnected));
      return;
    }
    
    this.matchingEnabled = false;
    this.emitStatus('매칭 중단');
  }

  // 이벤트 핸들러 등록 메서드
  onMessage(handler: (message: Message) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onMatch(handler: (user: User) => void) {
    this.matchHandlers.push(handler);
    return () => {
      this.matchHandlers = this.matchHandlers.filter(h => h !== handler);
    };
  }

  onRoomUpdate(handler: (room: ChatRoom) => void) {
    this.roomUpdateHandlers.push(handler);
    return () => {
      this.roomUpdateHandlers = this.roomUpdateHandlers.filter(h => h !== handler);
    };
  }

  onError(handler: (error: Error) => void) {
    this.errorHandlers.push(handler);
    return () => {
      this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
    };
  }

  onStatus(handler: (status: string) => void) {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler);
    };
  }

  // 내부 헬퍼 메서드
  private simulateResponse(roomId: string) {
    if (!this.connected) return;
    
    const participantId = roomId === '1' ? '2' : '3';
    const responseTypes = ['greetings', 'questions', 'answers', 'weather', 'activities', 'farewells'] as const;
    const responseType = responseTypes[Math.floor(Math.random() * responseTypes.length)];
    const responseList = responses[responseType];
    const content = responseList[Math.floor(Math.random() * responseList.length)];
    
    const responseMessage: Message = {
      id: uuidv4(),
      roomId,
      senderId: participantId,
      content,
      createdAt: new Date().toISOString(),
    };
    
    this.messageHandlers.forEach(handler => handler(responseMessage));
    
    const updatedRoom: ChatRoom = {
      id: roomId,
      participants: ['1', participantId],
      lastMessage: responseMessage.content,
      lastMessageTime: responseMessage.createdAt,
    };
    
    this.roomUpdateHandlers.forEach(handler => handler(updatedRoom));
  }
  
  private simulateMatchFound() {
    if (!this.connected || !this.matchingEnabled) return;
    
    const otherUsers = users.filter(u => u.id !== '1' && u.id !== 'system');
    const matchedUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
    
    this.matchHandlers.forEach(handler => handler(matchedUser));
    this.matchingEnabled = false;
    this.emitStatus('매칭 성공');
  }
  
  private emitSystemMessage(roomId: string, content: string) {
    const systemMessage: Message = {
      id: uuidv4(),
      roomId,
      senderId: 'system',
      content,
      createdAt: new Date().toISOString(),
    };
    
    this.messageHandlers.forEach(handler => handler(systemMessage));
  }

  private emitError(error: Error) {
    this.errorHandlers.forEach(handler => handler(error));
  }

  private emitStatus(status: string) {
    this.statusHandlers.forEach(handler => handler(status));
  }
}

export default MockSocketService.getInstance(); 