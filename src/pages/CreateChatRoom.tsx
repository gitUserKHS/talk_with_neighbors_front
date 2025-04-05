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
  Snackbar
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { chatService } from '../services/chatService';

const CreateChatRoom = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    maxMembers: 10,
    category: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await chatService.createRoom(formData);
      navigate('/chat/rooms');
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
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          
          <TextField
            margin="normal"
            required
            fullWidth
            type="number"
            label="최대 인원"
            inputProps={{ min: 2, max: 100 }}
            value={formData.maxMembers}
            onChange={(e) => setFormData({ ...formData, maxMembers: Number(e.target.value) })}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>카테고리</InputLabel>
            <Select
              required
              value={formData.category}
              label="카테고리"
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            >
              <MenuItem value="HOBBY">취미</MenuItem>
              <MenuItem value="STUDY">스터디</MenuItem>
              <MenuItem value="LIFE">일상</MenuItem>
            </Select>
          </FormControl>

          <TextField
            margin="normal"
            required
            fullWidth
            multiline
            rows={4}
            label="설명"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

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
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default CreateChatRoom;