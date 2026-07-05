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

const CreateChatRoom: React.FC = () => {
  const navigate = useNavigate();
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
      setError('1:1 채팅에는 상대 한 명만 추가할 수 있어.');
      return;
    }
    setParticipantNicknames((prev) => [...prev, nickname]);
    setNicknameInput('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (type === ChatRoomType.GROUP && !name.trim()) {
      setError('그룹 채팅방 이름을 입력해줘.');
      return;
    }

    if (type === ChatRoomType.ONE_ON_ONE && participantNicknames.length !== 1) {
      setError('1:1 채팅은 상대 닉네임 한 명이 필요해.');
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
      setError(err.response?.data?.message || '채팅방 생성에 실패했어.');
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
              채팅방 만들기
            </Typography>
            <Typography color="text.secondary">닉네임으로 참여자를 초대할 수 있어.</Typography>
          </Box>
          {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
          <FormControl fullWidth>
            <InputLabel>유형</InputLabel>
            <Select
              label="유형"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setParticipantNicknames((prev) =>
                  event.target.value === ChatRoomType.ONE_ON_ONE ? prev.slice(0, 1) : prev
                );
              }}
            >
              <MenuItem value={ChatRoomType.ONE_ON_ONE}>1:1 채팅</MenuItem>
              <MenuItem value={ChatRoomType.GROUP}>그룹 채팅</MenuItem>
            </Select>
          </FormControl>
          {type === ChatRoomType.GROUP && (
            <TextField label="채팅방 이름" value={name} onChange={(event) => setName(event.target.value)} fullWidth />
          )}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              label="참여자 닉네임"
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
              추가
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
            <Button onClick={() => navigate('/chat')}>취소</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              만들기
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Container>
  );
};

export default CreateChatRoom;
