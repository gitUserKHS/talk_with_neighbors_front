import React, { useMemo, useState } from 'react';
import {
  Alert, Box, Button, Chip, Container, FormControl, InputLabel, MenuItem,
  Paper, Select, Stack, Step, StepLabel, Stepper, TextField, Typography,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import LocationSelector from '../components/LocationSelector';
import { authService } from '../services/authService';
import { destinationAfterOnboarding } from '../services/profileSetup';
import { setUser } from '../store/slices/authSlice';
import { RootState, Location } from '../store/types';

const suggestions = ['산책', '카페', '독서', '영화', '요리', '운동', '반려동물', '게임', '사진', '음악'];
const steps = ['기본 정보', '관심사', '우리 동네'];

const Onboarding: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const returnTo = useMemo(
    () => destinationAfterOnboarding(new URLSearchParams(routeLocation.search).get('returnTo')),
    [routeLocation.search],
  );
  const [step, setStep] = useState(0);
  const [age, setAge] = useState(user?.age?.toString() || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [customInterest, setCustomInterest] = useState('');
  const [location, setLocation] = useState<Location | null>(user?.latitude && user?.longitude ? {
    latitude: user.latitude, longitude: user.longitude, address: user.address || '',
  } : null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleInterest = (interest: string) => setInterests((prev) =>
    prev.includes(interest) ? prev.filter((value) => value !== interest) : [...prev, interest].slice(0, 10));

  const addCustom = () => {
    const value = customInterest.trim();
    if (value && !interests.includes(value) && interests.length < 10) setInterests((prev) => [...prev, value]);
    setCustomInterest('');
  };

  const validate = () => {
    if (step === 0 && (!age || Number(age) < 18 || !gender)) return '나이와 성별을 확인해 줘.';
    if (step === 1 && interests.length === 0) return '관심사를 하나 이상 골라 줘.';
    if (step === 2 && !location) return '동네 이웃을 찾을 위치를 선택해 줘.';
    return null;
  };

  const next = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError(null);
    if (step < steps.length - 1) { setStep((value) => value + 1); return; }
    if (!user || !location) return;
    setSaving(true);
    try {
      const updated = await authService.updateProfile({
        username: user.username,
        age: Number(age), gender, interests,
        latitude: location.latitude, longitude: location.longitude, address: location.address,
      });
      dispatch(setUser(updated));
      navigate(returnTo, { replace: true });
    } catch {
      setError('프로필을 저장하지 못했어. 입력 내용을 확인해 줘.');
    } finally { setSaving(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
        <Typography variant="h4" fontWeight={850}>반가워, {user?.username}!</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
          세 단계만 채우면 취향이 잘 맞는 동네 친구를 추천해 줄게.
        </Typography>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && <Stack spacing={2}>
          <TextField label="나이" type="number" value={age} onChange={(event) => setAge(event.target.value)} inputProps={{ min: 18, max: 120 }} />
          <FormControl fullWidth><InputLabel>성별</InputLabel><Select value={gender} label="성별" onChange={(event) => setGender(event.target.value)}>
            <MenuItem value="female">여성</MenuItem><MenuItem value="male">남성</MenuItem><MenuItem value="other">그 외 / 공개하지 않음</MenuItem>
          </Select></FormControl>
        </Stack>}

        {step === 1 && <Stack spacing={2}>
          <Typography fontWeight={700}>좋아하는 것을 골라 줘</Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>{suggestions.map((interest) =>
            <Chip key={interest} label={interest} clickable color={interests.includes(interest) ? 'primary' : 'default'} onClick={() => toggleInterest(interest)} />)}</Stack>
          <Stack direction="row" spacing={1}><TextField fullWidth size="small" label="직접 추가" value={customInterest} onChange={(event) => setCustomInterest(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} /><Button onClick={addCustom}>추가</Button></Stack>
          <Typography variant="caption" color="text.secondary">최대 10개 · 현재 {interests.length}개</Typography>
        </Stack>}

        {step === 2 && <Stack spacing={2}>
          <Alert severity="info">정확한 좌표는 다른 사용자에게 공개하지 않아. 화면에는 동네 단위와 거리 구간만 보여줘.</Alert>
          <LocationSelector onLocationSelect={setLocation} initialLocation={location || undefined} />
          {location && <Typography variant="body2" color="text.secondary">선택한 동네: {location.address}</Typography>}
        </Stack>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)}>이전</Button>
          <Button variant="contained" disabled={saving} onClick={next}>{step === steps.length - 1 ? (saving ? '저장 중…' : '추천 시작하기') : '다음'}</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Onboarding;
