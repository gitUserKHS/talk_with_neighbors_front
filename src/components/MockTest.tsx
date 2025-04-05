import React, { useEffect, useState } from 'react';
import mockSocket from '../services/mock/socket';
import { Message, User, ChatRoom } from '../store/types';

const MockTest: React.FC = () => {
  const [status, setStatus] = useState<string>('연결 안됨');
  const [messages, setMessages] = useState<Message[]>([]);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [roomId, setRoomId] = useState('1');
  const [logs, setLogs] = useState<string[]>([]);

  // 로그 추가 함수
  const addLog = (log: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${log}`]);
  };

  useEffect(() => {
    // 소켓 이벤트 핸들러 등록
    const unsubStatus = mockSocket.onStatus(status => {
      setStatus(status);
      addLog(`상태 변경: ${status}`);
    });

    const unsubMessage = mockSocket.onMessage(message => {
      setMessages(prev => [...prev, message]);
      addLog(`메시지 수신: ${message.content}`);
    });

    const unsubMatch = mockSocket.onMatch(user => {
      setMatchedUser(user);
      addLog(`매칭됨: ${user.username}`);
    });

    const unsubRoom = mockSocket.onRoomUpdate(room => {
      setCurrentRoom(room);
      addLog(`채팅방 업데이트: ${room.id}`);
    });

    const unsubError = mockSocket.onError(error => {
      addLog(`에러 발생: ${error.message}`);
    });

    return () => {
      unsubStatus();
      unsubMessage();
      unsubMatch();
      unsubRoom();
      unsubError();
    };
  }, []);

  // 연결 테스트
  const handleConnect = () => {
    mockSocket.connect();
  };

  const handleDisconnect = () => {
    mockSocket.disconnect();
  };

  // 채팅방 테스트
  const handleJoinRoom = () => {
    mockSocket.joinRoom(roomId);
  };

  const handleLeaveRoom = () => {
    mockSocket.leaveRoom(roomId);
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      mockSocket.sendMessage(roomId, messageInput);
      setMessageInput('');
    }
  };

  // 매칭 테스트
  const handleStartMatching = () => {
    mockSocket.startMatching();
  };

  const handleStopMatching = () => {
    mockSocket.stopMatching();
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>모의 서비스 테스트</h1>
      
      {/* 상태 표시 */}
      <div style={{ marginBottom: '20px' }}>
        <h2>현재 상태: {status}</h2>
      </div>

      {/* 연결 테스트 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>연결 테스트</h3>
        <button onClick={handleConnect}>연결</button>
        <button onClick={handleDisconnect} style={{ marginLeft: '10px' }}>연결 해제</button>
      </div>

      {/* 채팅방 테스트 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>채팅방 테스트</h3>
        <div>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="채팅방 ID"
          />
          <button onClick={handleJoinRoom} style={{ marginLeft: '10px' }}>입장</button>
          <button onClick={handleLeaveRoom} style={{ marginLeft: '10px' }}>퇴장</button>
        </div>
        <div style={{ marginTop: '10px' }}>
          <input
            type="text"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="메시지 입력"
            style={{ width: '300px' }}
          />
          <button onClick={handleSendMessage} style={{ marginLeft: '10px' }}>전송</button>
        </div>
      </div>

      {/* 매칭 테스트 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>매칭 테스트</h3>
        <button onClick={handleStartMatching}>매칭 시작</button>
        <button onClick={handleStopMatching} style={{ marginLeft: '10px' }}>매칭 중단</button>
        {matchedUser && (
          <div style={{ marginTop: '10px' }}>
            매칭된 사용자: {matchedUser.username}
          </div>
        )}
      </div>

      {/* 메시지 목록 */}
      <div style={{ marginBottom: '20px' }}>
        <h3>메시지 목록</h3>
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '10px',
          height: '200px',
          overflowY: 'auto'
        }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: '5px' }}>
              <strong>{msg.senderId === '1' ? '나' : msg.senderId}</strong>: {msg.content}
            </div>
          ))}
        </div>
      </div>

      {/* 로그 */}
      <div>
        <h3>로그</h3>
        <div style={{ 
          border: '1px solid #ccc', 
          padding: '10px',
          height: '200px',
          overflowY: 'auto',
          backgroundColor: '#f5f5f5'
        }}>
          {logs.map((log, index) => (
            <div key={index} style={{ fontSize: '14px', fontFamily: 'monospace' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MockTest; 