import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { ChatRoomType, CreateRoomRequest } from '../../types/chat';
import { useI18n } from '../../i18n/I18nProvider';

const CreateChatRoom: React.FC = () => {
  const navigate = useNavigate();
  const { locale, t } = useI18n();
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(ChatRoomType.GROUP);
  const [nicknameInput, setNicknameInput] = useState('');
  const [participantNicknames, setParticipantNicknames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const addParticipant = () => {
    const nickname = nicknameInput.trim();
    if (!nickname || participantNicknames.includes(nickname)) return;
    if (type === ChatRoomType.ONE_ON_ONE && participantNicknames.length >= 1) {
      setError(t('1:1 채팅에는 상대방 한 명만 추가할 수 있습니다.', 'A one-to-one conversation can include only one other person.'));
      return;
    }
    setParticipantNicknames((prev) => [...prev, nickname]);
    setNicknameInput('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (type === ChatRoomType.GROUP && !name.trim()) {
      setError(t('그룹 채팅방 이름을 입력해 주세요.', 'Enter a name for the group conversation.'));
      return;
    }

    if (type === ChatRoomType.ONE_ON_ONE && participantNicknames.length !== 1) {
      setError(t('1:1 채팅에는 상대방의 닉네임이 필요합니다.', 'Enter the nickname of the person you want to chat with.'));
      return;
    }

    const request: CreateRoomRequest = {
      name: type === ChatRoomType.ONE_ON_ONE ? '' : name.trim(),
      type,
      participantNicknames,
    };

    setSubmitting(true);
    try {
      const room = await chatService.createRoom(request);
      navigate(`/chat/${room.id}`);
    } catch (err: any) {
      const fallback = t('채팅방을 만들지 못했습니다.', 'We could not create the conversation.');
      setError(locale === 'ko' ? err.response?.data?.message || fallback : fallback);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {t('대화 만들기', 'New conversation')}
            </Typography>
            <Typography color="text.secondary">
              {t('닉네임으로 이웃을 초대할 수 있습니다.', 'Invite neighbors by their nickname.')}
            </Typography>
          </Box>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <FormControl fullWidth>
            <InputLabel>{t('유형', 'Type')}</InputLabel>
            <Select
              label={t('유형', 'Type')}
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setParticipantNicknames((prev) =>
                  event.target.value === ChatRoomType.ONE_ON_ONE ? prev.slice(0, 1) : prev
                );
              }}
            >
              <MenuItem value={ChatRoomType.ONE_ON_ONE}>{t('1:1 채팅', 'One-to-one')}</MenuItem>
              <MenuItem value={ChatRoomType.GROUP}>{t('그룹 채팅', 'Group')}</MenuItem>
            </Select>
          </FormControl>
          {type === ChatRoomType.GROUP && (
            <TextField label={t('채팅방 이름', 'Conversation name')} value={name} onChange={(event) => setName(event.target.value)} fullWidth />
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label={t('참여자 닉네임', 'Participant nickname')}
              value={nicknameInput}
              onChange={(event) => setNicknameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addParticipant();
                }
              }}
              fullWidth
            />
            <Button variant="outlined" onClick={addParticipant}>
              {t('추가', 'Add')}
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {participantNicknames.map((nickname) => (
              <Chip
                key={nickname}
                label={nickname}
                onDelete={() =>
                  setParticipantNicknames((prev) => prev.filter((item) => item !== nickname))
                }
              />
            ))}
          </Stack>
          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button onClick={() => navigate('/chat')}>{t('취소', 'Cancel')}</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? t('만드는 중…', 'Creating…') : t('만들기', 'Create')}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default CreateChatRoom;
