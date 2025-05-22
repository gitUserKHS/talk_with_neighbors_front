import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  Divider,
  Snackbar,
  Alert,
} from '@mui/material';
import { authService } from '../services/authService';

interface ProfileData {
  nickname: string;
  email: string;
  gender: string;
  age: string;
  interests: string[];
  bio: string;
}

const Profile: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData>({
    nickname: '사용자',
    email: 'user@example.com',
    gender: '남성',
    age: '25',
    interests: ['게임', '음악', '영화'],
    bio: '안녕하세요! 새로운 친구를 만나고 싶습니다.',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newInterest, setNewInterest] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddInterest = () => {
    const interest = newInterest.trim();
    if (!interest) return;
    setProfileData(prev => ({
      ...prev,
      interests: [...prev.interests, interest]
    }));
    setNewInterest('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const user = await authService.getCurrentUser();
      if (!user) throw new Error('로그인 필요');
      const toUpdate = {
        ...user,
        username: profileData.nickname,
        gender: profileData.gender,
        age: Number(profileData.age),
        bio: profileData.bio,
        interests: profileData.interests,
      };
      await authService.updateProfile(toUpdate);
      setSuccess(true);
      setIsEditing(false);
    } catch (e) {
      console.error('프로필 업데이트 오류', e);
      setError('프로필 업데이트에 실패했습니다.');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setProfileData(prev => ({
            ...prev,
            nickname: user.username,
            email: user.email,
            gender: user.gender || prev.gender,
            age: user.age?.toString() || prev.age,
            interests: user.interests || prev.interests,
            bio: user.bio || prev.bio,
          }));
        }
      } catch (e) {
        console.error('프로필 조회 실패', e);
      }
    })();
  }, []);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar
            sx={{ width: 100, height: 100, mr: 3 }}
            src="/static/images/avatar/1.jpg"
          />
          <Box>
            <Typography variant="h4" gutterBottom>
              {profileData.nickname}
            </Typography>
            <Typography color="text.secondary">
              {profileData.email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <Box sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="닉네임"
                name="nickname"
                value={profileData.nickname}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="이메일"
                name="email"
                value={profileData.email}
                disabled
              />
            </Box>
            <Box sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="성별"
                name="gender"
                value={profileData.gender}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Box>
            <Box sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
              <TextField
                fullWidth
                label="나이"
                name="age"
                value={profileData.age}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <TextField
                fullWidth
                label="자기소개"
                name="bio"
                multiline
                rows={4}
                value={profileData.bio}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </Box>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle1" gutterBottom>
                관심사
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {profileData.interests.map((interest, index) => (
                  <Chip
                    key={index}
                    label={interest}
                    onDelete={isEditing ? () => {
                      setProfileData({
                        ...profileData,
                        interests: profileData.interests.filter((_, i) => i !== index),
                      });
                    } : undefined}
                  />
                ))}
              </Box>
              {isEditing && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <TextField
                    label="새 관심사"
                    size="small"
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInterest();
                      }
                    }}
                  />
                  <Button onClick={handleAddInterest} variant="outlined">
                    추가
                  </Button>
                </Box>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            {isEditing ? (
              <>
                <Button
                  variant="outlined"
                  onClick={() => setIsEditing(false)}
                  sx={{ mr: 1 }}
                >
                  취소
                </Button>
                <Button type="submit" variant="contained">
                  저장
                </Button>
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => setIsEditing(true)}
              >
                프로필 수정
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" onClose={() => setSuccess(false)}>
          프로필이 업데이트되었습니다!
        </Alert>
      </Snackbar>
      <Snackbar open={!!error} autoHideDuration={3000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile;