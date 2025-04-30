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
      // 진단용: 매칭 시작 전 콘솔 출력
      console.log('매칭 시작 요청 preferences:', preferences);
      const sessionId = localStorage.getItem('sessionId') || sessionStorage.getItem('sessionId');
      console.log('매칭 시작 요청 SessionId:', sessionId);
      await matchingService.startMatching(preferences);
      // 실제 매칭 후보를 서버에서 받아오는 로직 추가 필요
      // 예시: 주변 사용자 검색 후 첫 번째 매칭을 currentMatch로 설정
      const candidates = await matchingService.searchNearbyUsers(
        preferences.location.latitude,
        preferences.location.longitude,
        preferences.maxDistance
      );
      if (candidates && candidates.length > 0) {
        if (!candidates[0].id) {
          alert('경고: 서버에서 받은 매칭 후보에 id가 없습니다. 백엔드에서 id 필드가 누락되지 않았는지 확인하세요.');
          setCurrentMatch(null);
          setShowMatchDialog(false);
          setIsMatching(false);
          return;
        }
        setCurrentMatch(candidates[0]);
        setShowMatchDialog(true);
      } else {
        setCurrentMatch(null);
        setShowMatchDialog(false);
        alert('주변에 매칭될 사용자가 없습니다.');
      }
    } catch (error) {
      setIsMatching(false);
      console.error('매칭 시작 실패:', error);
      alert('매칭 시작 중 오류가 발생했습니다.');
    }
  };

  const handleStopMatching = async () => {
    try {
      await matchingService.stopMatching();
      setIsMatching(false);
      setCurrentMatch(null);
      setShowMatchDialog(false);
    } catch (error) {
      console.error('매칭 중단 실패:', error);
      alert('매칭 중단 중 오류가 발생했습니다.');
    }
  };

  // 매칭 수락
  const handleAcceptMatch = async () => {
    if (!currentMatch || !currentMatch.id) {
      alert('매칭 정보가 올바르지 않습니다. (id 없음)');
      return;
    }
    try {
      await matchingService.acceptMatch(currentMatch.id);
      setShowMatchDialog(false);
      setCurrentMatch(null);
      // TODO: 채팅방 이동 등 후속 처리
    } catch (error) {
      console.error('매칭 수락 실패:', error);
    }
  };

  // 매칭 거절
  const handleRejectMatch = async () => {
    if (!currentMatch || !currentMatch.id) {
      alert('매칭 정보가 올바르지 않습니다. (id 없음)');
      return;
    }
    try {
      await matchingService.rejectMatch(currentMatch.id);
      setShowMatchDialog(false);
      setCurrentMatch(null);
    } catch (error) {
      console.error('매칭 거절 실패:', error);
    }
  };

  // 대화 시작(수락과 별개로, 실제 채팅방 이동 등)
  const handleStartChat = async () => {
    // TODO: 채팅방 이동 구현
    setShowMatchDialog(false);
  };

  // 매칭 건너뛰기(거절과 유사)
  const handleSkipMatch = async () => {
    await handleRejectMatch();
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
              <Typography variant="body1" gutterBottom>
                {currentMatch.bio}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {currentMatch.interests.map((interest: string, index: number) => (
                  <Chip key={index} label={interest} />
                ))}
              </Box>
              {/* 매칭 수락/거절 버튼 */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
                <Button variant="contained" color="primary" onClick={handleAcceptMatch}>수락</Button>
                <Button variant="outlined" color="secondary" onClick={handleRejectMatch}>거절</Button>
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
          <Button onClick={handleRejectMatch}>거절</Button>
          <Button onClick={handleAcceptMatch} variant="contained">
            수락
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Matching;