import React, { useState } from 'react';
import { ChatRoomType } from '../types/chat';
import { chatService } from '../services/chatService';
import { useI18n } from '../i18n/I18nProvider';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onRoomCreated }) => {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [type, setType] = useState<ChatRoomType>(ChatRoomType.GROUP);
  const [participantInput, setParticipantInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await chatService.createRoom({
        name,
        type,
        participantNicknames: participantInput
          .split(',')
          .map((nickname) => nickname.trim())
          .filter(Boolean),
      });
      onRoomCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>{t('새 채팅방 만들기', 'Create a conversation')}</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>{t('채팅방 이름:', 'Conversation name:')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label>{t('채팅방 유형:', 'Conversation type:')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ChatRoomType)}
            >
              <option value={ChatRoomType.ONE_ON_ONE}>{t('1:1 채팅', 'One-to-one')}</option>
              <option value={ChatRoomType.GROUP}>{t('그룹 채팅', 'Group')}</option>
            </select>
          </div>
          <div>
            <label>{t('참여자 닉네임:', 'Participant nicknames:')}</label>
            <input
              type="text"
              value={participantInput}
              onChange={(e) => setParticipantInput(e.target.value)}
              placeholder={t('쉼표로 구분해 주세요', 'Separate with commas')}
            />
          </div>
          <div className="modal-buttons">
            <button type="submit">{t('생성', 'Create')}</button>
            <button type="button" onClick={onClose}>{t('취소', 'Cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}; 
