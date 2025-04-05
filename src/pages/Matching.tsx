import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import LocationSelector from '../components/LocationSelector';
import { Location, MatchProfile, MatchingPreferences } from '../store/types';
import matchingService from '../services/matchingService';

const Matching: React.FC = () => {
  const [isMatching, setIsMatching] = useState(false);
  const [currentMatch, setCurrentMatch] = useState<MatchProfile | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [preferences, setPreferences] = useState<MatchingPreferences>({
    location: {
      latitude: 0,
      longitude: 0,
      address: '',
    },
    maxDistance: 10,
    ageRange: [20, 35],
    gender: 'any',
    interests: [],
  });

  const handleLocationSelect = (location: Location) => {
    setPreferences((prev: MatchingPreferences) => ({
      ...prev,
      location,
    }));
  };

  const handleStartMatching = async () => {
    try {
      setIsMatching(true);
      await matchingService.startMatching(preferences);
      
      // 임시 매칭 시뮬레이션
      setTimeout(() => {
        setCurrentMatch({
          id: '1',
          username: '새로운 친구',
          age: 25,
          gender: '여성',
          interests: ['게임', '음악', '영화'],
          bio: '안녕하세요! 새로운 친구를 만나고 싶습니다.',
          profileImage: '/static/images/avatar/2.jpg',
          distance: 2.5,
        });
        setShowMatchDialog(true);
      }, 2000);
    } catch (error) {
      console.error('매칭 시작 실패:', error);
    }
  };

  const handleStopMatching = async () => {
    try {
      await matchingService.stopMatching();
      setIsMatching(false);
    } catch (error) {
      console.error('매칭 중단 실패:', error);
    }
  };

  const handleStartChat = async () => {
    if (currentMatch) {
      try {
        await matchingService.acceptMatch(currentMatch.id);
        setShowMatchDialog(false);
        // TODO: Navigate to chat room
      } catch (error) {
        console.error('매칭 수락 실패:', error);
      }
    }
  };

  const handleSkipMatch = async () => {
    if (currentMatch) {
      try {
        await matchingService.rejectMatch(currentMatch.id);
        setShowMatchDialog(false);
        setCurrentMatch(null);
      } catch (error) {
        console.error('매칭 거절 실패:', error);
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          새로운 친구 찾기
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            매칭 설정
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box>
              <LocationSelector
                onLocationSelect={handleLocationSelect}
                initialLocation={preferences.location.address ? {
                  latitude: preferences.location.latitude,
                  longitude: preferences.location.longitude,
                  address: preferences.location.address
                } : undefined}
              />
            </Box>
            
            <Box>
              <Typography gutterBottom>
                검색 반경: {preferences.maxDistance}km
              </Typography>
              <Slider
                value={preferences.maxDistance}
                onChange={(_, value) => 
                  setPreferences((prev: MatchingPreferences) => ({ ...prev, maxDistance: value as number }))
                }
                min={1}
                max={50}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <FormControl fullWidth>
                  <InputLabel>성별</InputLabel>
                  <Select
                    value={preferences.gender}
                    label="성별"
                    onChange={(e) => 
                      setPreferences((prev: MatchingPreferences) => ({ ...prev, gender: e.target.value }))
                    }
                  >
                    <MenuItem value="any">모두</MenuItem>
                    <MenuItem value="male">남성</MenuItem>
                    <MenuItem value="female">여성</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 8px)' } }}>
                <TextField
                  fullWidth
                  label="관심사 (쉼표로 구분)"
                  value={preferences.interests?.join(', ')}
                  onChange={(e) => 
                    setPreferences((prev: MatchingPreferences) => ({
                      ...prev,
                      interests: e.target.value.split(',').map(i => i.trim()),
                    }))
                  }
                />
              </Box>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          {!isMatching ? (
            <Button
              variant="contained"
              size="large"
              onClick={handleStartMatching}
              disabled={!preferences.location.address}
            >
              매칭 시작하기
            </Button>
          ) : (
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              onClick={handleStopMatching}
            >
              매칭 중단하기
            </Button>
          )}
        </Box>

        {currentMatch && (
          <Card sx={{ mt: 4 }}>
            <CardMedia
              component="img"
              height="300"
              image={currentMatch.profileImage}
              alt={currentMatch.username}
            />
            <CardContent>
              <Typography variant="h5" gutterBottom>
                {currentMatch.username} ({currentMatch.age}세)
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {currentMatch.distance.toFixed(1)}km 떨어짐
              </Typography>
              <Typography variant="body1" paragraph>
                {currentMatch.bio}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {currentMatch.interests.map((interest: string, index: number) => (
                  <Chip key={index} label={interest} />
                ))}
              </Box>
            </CardContent>
          </Card>
        )}
      </Paper>

      <Dialog open={showMatchDialog} onClose={() => setShowMatchDialog(false)}>
        <DialogTitle>새로운 매칭!</DialogTitle>
        <DialogContent>
          <Typography>
            {currentMatch?.username}님과 매칭되었습니다.
            {currentMatch && `(${currentMatch.distance.toFixed(1)}km 떨어짐)`}
            대화를 시작하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSkipMatch}>건너뛰기</Button>
          <Button onClick={handleStartChat} variant="contained">
            대화 시작하기
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Matching; 