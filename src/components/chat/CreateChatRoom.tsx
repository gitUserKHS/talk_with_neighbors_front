import React, { useState, useEffect } from 'react';
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
  Chip,
  FormHelperText
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../../services/chatService';
import { ChatRoomType, CreateRoomRequest } from '../../types/chat';

const CreateChatRoom = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<string>(ChatRoomType.GROUP);
  const [participantNicknames, setParticipantNicknames] = useState<string[]>([]);
  const [newParticipantNickname, setNewParticipantNickname] = useState('');
  const [isRoomNameDisabled, setIsRoomNameDisabled] = useState(false);

  useEffect(() => {
    if (type === ChatRoomType.ONE_ON_ONE) {
      setIsRoomNameDisabled(true);
      // setName(''); // 1:1 채팅 시 방 이름은 서버에서 자동 생성, 이전 입력값 유지를 위해 주석 처리
    } else {
      setIsRoomNameDisabled(false);
    }
  }, [type]);

  const handleAddParticipant = () => {
    const nickname = newParticipantNickname.trim();
    if (nickname && !participantNicknames.includes(nickname)) {
      if (type === ChatRoomType.ONE_ON_ONE && participantNicknames.length >= 1) {
        setError('1:1 채팅에는 한 명의 참여자만 추가할 수 있습니다.');
        return;
      }
      setParticipantNicknames([...participantNicknames, nickname]);
      setNewParticipantNickname('');
      setError(null);
    }
  };

  const handleRemoveParticipant = (nicknameToRemove: string) => {
    setParticipantNicknames(participantNicknames.filter(nickname => nickname !== nicknameToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (type === ChatRoomType.GROUP && !name.trim()) {
      setError('그룹 채팅방의 이름을 입력해주세요.');
      return;
    }

    if (type === ChatRoomType.ONE_ON_ONE && participantNicknames.length !== 1) {
      setError('1:1 채팅방을 만들려면 정확히 한 명의 참여자 닉네임을 추가해야 합니다.');
      return;
    }

    const request: CreateRoomRequest = {
      name: type === ChatRoomType.ONE_ON_ONE ? '' : name.trim(),
      type,
      participantNicknames: participantNicknames.length > 0 ? participantNicknames : undefined,
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
            required={type === ChatRoomType.GROUP}
            fullWidth
            label="방 제목"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isRoomNameDisabled}
            helperText={isRoomNameDisabled ? '1:1 채팅방의 이름은 참여자 닉네임으로 자동 생성됩니다.' : ''}
          />
          
          <FormControl fullWidth margin="normal">
            <InputLabel>채팅방 유형</InputLabel>
            <Select
              value={type}
              label="채팅방 유형"
              onChange={(e) => {
                const newType = e.target.value;
                setType(newType);
                if (newType === ChatRoomType.ONE_ON_ONE && participantNicknames.length > 1) {
                  setParticipantNicknames(participantNicknames.slice(0, 1));
                  setError('1:1 채팅으로 변경되어 참여자 목록이 조정되었습니다. 한 명의 참여자만 유지됩니다.');
                }
              }}
            >
              <MenuItem value={ChatRoomType.ONE_ON_ONE}>1:1 채팅</MenuItem>
              <MenuItem value={ChatRoomType.GROUP}>그룹 채팅</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              {type === ChatRoomType.ONE_ON_ONE ? '상대방 닉네임 추가' : '참여자 추가 (선택사항)'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: type === ChatRoomType.ONE_ON_ONE && participantNicknames.length >=1 ? 0 : 2 }}>
              {!(type === ChatRoomType.ONE_ON_ONE && participantNicknames.length >= 1) && (
                <>
                  <TextField
                    fullWidth
                    label="참여자 닉네임"
                    value={newParticipantNickname}
                    onChange={(e) => setNewParticipantNickname(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    onClick={handleAddParticipant}
                    disabled={!newParticipantNickname.trim() || (type === ChatRoomType.ONE_ON_ONE && participantNicknames.length >=1 )}
                  >
                    추가
                  </Button>
                </>
              )}
            </Box>
            {type === ChatRoomType.ONE_ON_ONE && participantNicknames.length === 0 && (
                 <FormHelperText sx={{mb:2}}>1:1 채팅을 시작할 상대방의 닉네임(사용자명)을 입력하세요.</FormHelperText>
            )}
            {type === ChatRoomType.GROUP && (
                <FormHelperText sx={{mb:2}}>그룹 채팅에 참여할 사용자들의 닉네임(사용자명)을 입력하세요. (선택)</FormHelperText>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt:1 }}>
              {participantNicknames.map((nickname) => (
                <Chip
                  key={nickname}
                  label={nickname}
                  onDelete={() => handleRemoveParticipant(nickname)}
                />
              ))}
            </Box>
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
          >
            채팅방 만들기
          </Button>
        </form>
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateChatRoom; 