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
import { useI18n } from '../i18n/I18nProvider';

const suggestions = [
  ['산책', 'Walking'], ['카페', 'Cafes'], ['독서', 'Reading'], ['영화', 'Movies'],
  ['요리', 'Cooking'], ['운동', 'Fitness'], ['반려동물', 'Pets'], ['게임', 'Gaming'],
  ['사진', 'Photography'], ['음악', 'Music'],
] as const;

const Onboarding: React.FC = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const dispatch = useDispatch();
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const steps = [t('기본 정보', 'About you'), t('관심사', 'Interests'), t('우리 동네', 'Your area')];
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
    if (step === 0 && (!age || Number(age) < 18 || !gender)) return t('나이와 성별을 확인해 주세요.', 'Please check your age and gender.');
    if (step === 1 && interests.length === 0) return t('관심사를 하나 이상 선택해 주세요.', 'Choose at least one interest.');
    if (step === 2 && !location) return t('동네 이웃을 찾을 지역을 선택해 주세요.', 'Choose an area where you would like to meet neighbors.');
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
      setError(t('프로필을 저장하지 못했습니다. 입력 내용을 확인해 주세요.', 'We could not save your profile. Please check your information.'));
    } finally { setSaving(false); }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 4 }}>
        <Typography variant="h4" fontWeight={850}>{t(`${user?.username}님, 반갑습니다!`, `Welcome, ${user?.username}!`)}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 4 }}>
          {t('세 단계만 완료하면 취향이 잘 맞는 동네 이웃을 추천해 드립니다.', 'Complete three quick steps to get more relevant neighbor recommendations.')}
        </Typography>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
          {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
        </Stepper>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === 0 && <Stack spacing={2}>
          <TextField label={t('나이', 'Age')} type="number" value={age} onChange={(event) => setAge(event.target.value)} inputProps={{ min: 18, max: 120 }} />
          <FormControl fullWidth><InputLabel>{t('성별', 'Gender')}</InputLabel><Select value={gender} label={t('성별', 'Gender')} onChange={(event) => setGender(event.target.value)}>
            <MenuItem value="female">{t('여성', 'Woman')}</MenuItem><MenuItem value="male">{t('남성', 'Man')}</MenuItem><MenuItem value="other">{t('그 외 / 공개하지 않음', 'Other / Prefer not to say')}</MenuItem>
          </Select></FormControl>
        </Stack>}

        {step === 1 && <Stack spacing={2}>
          <Typography fontWeight={700}>{t('좋아하는 관심사를 선택해 주세요', 'Choose what you enjoy')}</Typography>
          <Stack direction="row" flexWrap="wrap" useFlexGap gap={1}>{suggestions.map(([interest, english]) =>
            <Chip key={interest} label={t(interest, english)} clickable color={interests.includes(interest) ? 'primary' : 'default'} onClick={() => toggleInterest(interest)} />)}</Stack>
          <Stack direction="row" spacing={1}><TextField fullWidth size="small" label={t('직접 추가', 'Add your own')} value={customInterest} onChange={(event) => setCustomInterest(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustom(); } }} /><Button onClick={addCustom}>{t('추가', 'Add')}</Button></Stack>
          <Typography variant="caption" color="text.secondary">{t(`최대 10개 · 현재 ${interests.length}개`, `Up to 10 · ${interests.length} selected`)}</Typography>
        </Stack>}

        {step === 2 && <Stack spacing={2}>
          <Alert severity="info">{t('정확한 좌표는 다른 사용자에게 공개하지 않습니다. 화면에는 동네 단위와 거리 구간만 표시됩니다.', 'Your exact coordinates are not shared with other users. Only your neighborhood and an approximate distance range are shown.')}</Alert>
          <LocationSelector onLocationSelect={setLocation} initialLocation={location || undefined} />
          {location && <Typography variant="body2" color="text.secondary">{t(`선택한 동네: ${location.address}`, `Selected area: ${location.address}`)}</Typography>}
        </Stack>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button disabled={step === 0 || saving} onClick={() => setStep((value) => value - 1)}>{t('이전', 'Back')}</Button>
          <Button variant="contained" disabled={saving} onClick={next}>{step === steps.length - 1 ? (saving ? t('저장 중…', 'Saving…') : t('추천 시작하기', 'See recommendations')) : t('다음', 'Next')}</Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Onboarding;
