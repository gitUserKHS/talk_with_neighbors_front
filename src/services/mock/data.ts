import { User, ChatRoom, Message } from '../../store/types';
import { v4 as uuidv4 } from 'uuid';

// 모의 사용자 데이터
export const currentUser: User = {
  id: '1',
  username: '현재사용자',
  email: 'user@example.com',
  profileImage: 'https://via.placeholder.com/150',
};

export const users: User[] = [
  currentUser,
  {
    id: '2',
    username: '이웃1',
    email: 'neighbor1@example.com',
    profileImage: 'https://via.placeholder.com/150',
  },
  {
    id: '3',
    username: '이웃2',
    email: 'neighbor2@example.com',
    profileImage: 'https://via.placeholder.com/150',
  },
  {
    id: '4',
    username: '이웃3',
    email: 'neighbor3@example.com',
    profileImage: 'https://via.placeholder.com/150',
  },
  {
    id: '5',
    username: '새로운이웃',
    email: 'new.neighbor@example.com',
    profileImage: 'https://via.placeholder.com/150',
  },
  {
    id: 'system',
    username: '시스템',
    email: 'system@example.com',
    profileImage: 'https://via.placeholder.com/150',
  },
];

// 모의 채팅방 데이터
export const chatRooms: ChatRoom[] = [
  {
    id: '1',
    participants: ['1', '2'],
    lastMessage: '안녕하세요!',
    lastMessageTime: new Date().toISOString(),
  },
  {
    id: '2',
    participants: ['1', '3'],
    lastMessage: '반갑습니다!',
    lastMessageTime: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '3',
    participants: ['1', '4'],
    lastMessage: '오늘 날씨가 좋네요.',
    lastMessageTime: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '4',
    participants: ['1', '2', '3'],
    lastMessage: '그룹 채팅방입니다.',
    lastMessageTime: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: '5',
    participants: ['1', '5'],
    lastMessage: '',
    lastMessageTime: new Date().toISOString(),
  },
];

// 모의 메시지 데이터
export const messages: Record<string, Message[]> = {
  '1': [
    {
      id: '1',
      roomId: '1',
      senderId: '2',
      content: '안녕하세요!',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '2',
      roomId: '1',
      senderId: '1',
      content: '반갑습니다! 어떻게 지내세요?',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '3',
      roomId: '1',
      senderId: 'system',
      content: '채팅방에 입장했습니다.',
      createdAt: new Date(Date.now() - 3500000).toISOString(),
    },
  ],
  '2': [
    {
      id: '4',
      roomId: '2',
      senderId: '3',
      content: '반갑습니다!',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  '3': [
    {
      id: '5',
      roomId: '3',
      senderId: '4',
      content: '오늘 날씨가 좋네요.',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: '6',
      roomId: '3',
      senderId: '1',
      content: '네, 정말 좋네요!',
      createdAt: new Date(Date.now() - 7100000).toISOString(),
    },
  ],
  '4': [
    {
      id: '7',
      roomId: '4',
      senderId: '1',
      content: '그룹 채팅방을 만들었습니다.',
      createdAt: new Date(Date.now() - 10800000).toISOString(),
    },
    {
      id: '8',
      roomId: '4',
      senderId: '2',
      content: '안녕하세요!',
      createdAt: new Date(Date.now() - 10700000).toISOString(),
    },
    {
      id: '9',
      roomId: '4',
      senderId: '3',
      content: '반갑습니다!',
      createdAt: new Date(Date.now() - 10600000).toISOString(),
    },
  ],
  '5': [], // 빈 채팅방
};

// 모의 응답 메시지
export const responses = {
  greetings: [
    '안녕하세요!',
    '반갑습니다!',
    '좋은 하루 되세요!',
    '만나서 반가워요.',
  ],
  questions: [
    '어떻게 지내세요?',
    '이 근처에 사시나요?',
    '동네에서 좋아하는 장소가 있으신가요?',
    '혹시 이 근처에 맛집 추천해주실 수 있나요?',
  ],
  answers: [
    '네, 잘 지내고 있어요.',
    '저는 역 근처에 살고 있어요.',
    '공원에서 산책하는 걸 좋아해요.',
    '○○식당이 정말 맛있어요!',
  ],
  weather: [
    '오늘 날씨가 정말 좋네요.',
    '비가 올 것 같아요.',
    '조금 쌀쌀한 것 같아요.',
    '산책하기 좋은 날씨예요.',
  ],
  activities: [
    '지금 동네 산책 중이에요.',
    '카페에서 커피 마시고 있어요.',
    '장보러 가는 길이에요.',
    '공원에서 운동하고 있어요.',
  ],
  farewells: [
    '이만 가볼게요!',
    '다음에 또 이야기해요.',
    '좋은 하루 보내세요!',
    '조심히 들어가세요.',
  ],
};

// 모의 에러 메시지
export const errors = {
  auth: {
    invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    userNotFound: '사용자를 찾을 수 없습니다.',
    emailInUse: '이미 사용 중인 이메일입니다.',
    unauthorized: '인증되지 않았습니다.',
  },
  chat: {
    roomNotFound: '채팅방을 찾을 수 없습니다.',
    messageNotFound: '메시지를 찾을 수 없습니다.',
    invalidParticipant: '채팅방 참여자가 아닙니다.',
  },
  socket: {
    connectionError: '소켓 연결에 실패했습니다.',
    disconnected: '연결이 끊어졌습니다.',
  },
}; 