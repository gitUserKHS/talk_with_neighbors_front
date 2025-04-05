import React, { useState } from 'react';
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
} from '@mui/material';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement profile update logic
    setIsEditing(false);
  };

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
                <Button
                  type="submit"
                  variant="contained"
                >
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
    </Container>
  );
};

export default Profile; 