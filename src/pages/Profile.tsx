import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { authService } from '../services/authService';
import LocationSelector from '../components/LocationSelector';
import { Location } from '../store/types';
import { setUser } from '../store/slices/authSlice';

interface ProfileData {
  username: string;
  email: string;
  gender: string;
  age: string;
  interests: string[];
  bio: string;
  profileImage: string;
  location: Location | null;
}

const Profile: React.FC = () => {
  const dispatch = useDispatch();
  const [profileData, setProfileData] = useState<ProfileData>({
    username: '',
    email: '',
    gender: 'any',
    age: '',
    interests: [],
    bio: '',
    profileImage: '',
    location: null,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newInterest, setNewInterest] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (!user) return;

        setProfileData({
          username: user.username,
          email: user.email,
          gender: user.gender || 'any',
          age: user.age?.toString() || '',
          interests: user.interests || [],
          bio: user.bio || '',
          profileImage: user.profileImage || '',
          location:
            user.latitude && user.longitude
              ? {
                  latitude: user.latitude,
                  longitude: user.longitude,
                  address: user.address || '',
                }
              : null,
        });
      } catch {
        setError('프로필을 불러오지 못했어.');
      }
    };

    loadProfile();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddInterest = () => {
    const interest = newInterest.trim();
    if (!interest || profileData.interests.includes(interest)) return;
    setProfileData((prev) => ({
      ...prev,
      interests: [...prev.interests, interest],
    }));
    setNewInterest('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const updatedUser = await authService.updateProfile({
        username: profileData.username,
        gender: profileData.gender === 'any' ? undefined : profileData.gender,
        age: profileData.age ? Number(profileData.age) : undefined,
        bio: profileData.bio,
        interests: profileData.interests,
        profileImage: profileData.profileImage || undefined,
        latitude: profileData.location?.latitude,
        longitude: profileData.location?.longitude,
        address: profileData.location?.address,
      });

      dispatch(setUser(updatedUser));
      setSuccess(true);
      setIsEditing(false);
    } catch {
      setError('프로필 저장에 실패했어.');
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Stack spacing={3} component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Avatar src={profileData.profileImage} sx={{ width: 88, height: 88 }}>
              {profileData.username?.[0]}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {profileData.username || '내 프로필'}
              </Typography>
              <Typography color="text.secondary">{profileData.email}</Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField
              label="닉네임"
              name="username"
              value={profileData.username}
              onChange={handleChange}
              disabled={!isEditing}
              fullWidth
            />
            <TextField label="이메일" value={profileData.email} disabled fullWidth />
            <FormControl fullWidth disabled={!isEditing}>
              <InputLabel>성별</InputLabel>
              <Select
                value={profileData.gender}
                label="성별"
                onChange={(event) =>
                  setProfileData((prev) => ({ ...prev, gender: event.target.value }))
                }
              >
                <MenuItem value="any">선택 안 함</MenuItem>
                <MenuItem value="male">남성</MenuItem>
                <MenuItem value="female">여성</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="나이"
              name="age"
              value={profileData.age}
              onChange={handleChange}
              disabled={!isEditing}
              type="number"
              fullWidth
            />
          </Box>

          <TextField
            label="프로필 이미지 URL"
            name="profileImage"
            value={profileData.profileImage}
            onChange={handleChange}
            disabled={!isEditing}
            fullWidth
          />
          <TextField
            label="자기소개"
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
            disabled={!isEditing}
            multiline
            minRows={4}
            fullWidth
          />

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              위치
            </Typography>
            <LocationSelector
              onLocationSelect={(location) =>
                setProfileData((prev) => ({ ...prev, location }))
              }
              initialLocation={profileData.location || undefined}
              disabled={!isEditing}
            />
            {profileData.location && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {profileData.location.address} ({profileData.location.latitude.toFixed(4)},{' '}
                {profileData.location.longitude.toFixed(4)})
              </Typography>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              관심사
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {profileData.interests.map((interest) => (
                <Chip
                  key={interest}
                  label={interest}
                  onDelete={
                    isEditing
                      ? () =>
                          setProfileData((prev) => ({
                            ...prev,
                            interests: prev.interests.filter((item) => item !== interest),
                          }))
                      : undefined
                  }
                />
              ))}
            </Stack>
            {isEditing && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.5 }}>
                <TextField
                  size="small"
                  label="관심사 추가"
                  value={newInterest}
                  onChange={(event) => setNewInterest(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleAddInterest();
                    }
                  }}
                />
                <Button variant="outlined" onClick={handleAddInterest}>
                  추가
                </Button>
              </Stack>
            )}
          </Box>

          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            {isEditing ? (
              <>
                <Button onClick={() => setIsEditing(false)}>취소</Button>
                <Button type="submit" variant="contained">
                  저장
                </Button>
              </>
            ) : (
              <Button variant="contained" onClick={() => setIsEditing(true)}>
                프로필 수정
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Snackbar open={success} autoHideDuration={3000} onClose={() => setSuccess(false)}>
        <Alert severity="success" onClose={() => setSuccess(false)}>
          프로필을 저장했어.
        </Alert>
      </Snackbar>
      <Snackbar open={Boolean(error)} autoHideDuration={4000} onClose={() => setError(null)}>
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Profile;
