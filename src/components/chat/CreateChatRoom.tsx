import React, { useState } from 'react';
import {
  Container,
  TextField,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  Chip
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { ChatRoomType, CreateRoomRequest } from '../../types/chat';

const CreateChatRoom = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<ChatRoomType>(ChatRoomType.GROUP);
  const [participants, setParticipants] = useState<number[]>([]);
  const [newParticipant, setNewParticipant] = useState('');

  const handleAddParticipant = () => {
    const participantId = parseInt(newParticipant);
    if (!isNaN(participantId) && !participants.includes(participantId)) {
      setParticipants([...participants, participantId]);
      setNewParticipant('');
    }
  };

  const handleRemoveParticipant = (participantId: number) => {
    setParticipants(participants.filter(id => id !== participantId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const request: CreateRoomRequest = {
      name: name.trim(),
      type,
      participantIds: participants.length > 0 ? participants : undefined
    };

    try {
      const newRoom = await chatService.createRoom(request);
      navigate(`/chat/${newRoom.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || '채팅방 생성에 실패했습니다.');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          채팅방 만들기
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="방 제목"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>채팅방 유형</InputLabel>
            <Select
              value={type}
              label="채팅방 유형"
              onChange={(e) => setType(e.target.value as ChatRoomType)}
            >
              <MenuItem value={ChatRoomType.ONE_ON_ONE}>1:1 채팅</MenuItem>
              <MenuItem value={ChatRoomType.GROUP}>그룹 채팅</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              참여자 추가 (선택사항)
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="참여자 ID"
                type="number"
                value={newParticipant}
                onChange={(e) => setNewParticipant(e.target.value)}
                helperText="참여자를 추가하지 않으면 누구나 참여할 수 있는 채팅방이 됩니다"
              />
              <Button
                variant="contained"
                onClick={handleAddParticipant}
                disabled={!newParticipant}
              >
                추가
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {participants.map((participant) => (
                <Chip
                  key={participant}
                  label={participant}
                  onDelete={() => handleRemoveParticipant(participant)}
                />
              ))}
            </Box>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={!name.trim()}
          >
            채팅방 만들기
          </Button>
        </form>
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateChatRoom; 