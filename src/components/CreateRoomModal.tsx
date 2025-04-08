import React, { useState } from 'react';
import { ChatRoomType } from '../types/chat';
import { chatService } from '../services/chatService';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onRoomCreated }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChatRoomType>(ChatRoomType.GROUP);
  const [participantIds, setParticipantIds] = useState<number[]>([]);
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await chatService.createRoom(name, type, participantIds, description);
      onRoomCreated();
      onClose();
    } catch (error) {
      console.error('채팅방 생성 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>새 채팅방 만들기</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>채팅방 이름:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>채팅방 타입:</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ChatRoomType)}
            >
              <option value={ChatRoomType.ONE_ON_ONE}>1:1 채팅</option>
              <option value={ChatRoomType.GROUP}>그룹 채팅</option>
            </select>
          </div>
          <div>
            <label>설명:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="modal-buttons">
            <button type="submit">생성</button>
            <button type="button" onClick={onClose}>취소</button>
          </div>
        </form>
      </div>
    </div>
  );
}; 