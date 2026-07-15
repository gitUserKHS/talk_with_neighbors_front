import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  useMediaQuery,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTheme } from '@mui/material/styles';
import MapLocationPicker from '../../MapLocationPicker';
import { ChatSchedule, ChatScheduleFormValues } from '../../../types/chatSchedule';
import {
  defaultScheduleDateTimeInput,
  toLocalDateTimeInput,
} from '../../../services/chatScheduleDateTime';

interface ChatScheduleFormDialogProps {
  open: boolean;
  schedule?: ChatSchedule | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (values: ChatScheduleFormValues) => Promise<void>;
}

const createInitialValues = (schedule?: ChatSchedule | null): ChatScheduleFormValues => ({
  title: schedule?.title ?? '',
  description: schedule?.description ?? '',
  startsAt: schedule ? toLocalDateTimeInput(schedule.startsAt) : defaultScheduleDateTimeInput(),
  durationMinutes: schedule?.durationMinutes ?? 120,
  location: schedule?.location ?? '',
  locationAddress: schedule?.locationAddress,
  latitude: schedule?.latitude,
  longitude: schedule?.longitude,
  kakaoPlaceId: schedule?.kakaoPlaceId,
});

const ChatScheduleFormDialog: React.FC<ChatScheduleFormDialogProps> = ({
  open,
  schedule,
  saving = false,
  onClose,
  onSave,
}) => {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const [values, setValues] = useState<ChatScheduleFormValues>(() => createInitialValues(schedule));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(createInitialValues(schedule));
    setError(null);
  }, [open, schedule]);

  const handleSave = async () => {
    const title = values.title.trim();
    if (title.length < 2) {
      setError('약속 이름은 두 글자 이상 입력해줘.');
      return;
    }
    if (!values.startsAt || Number.isNaN(new Date(values.startsAt).getTime())) {
      setError('약속 날짜와 시간을 확인해줘.');
      return;
    }
    if (new Date(values.startsAt).getTime() <= Date.now()) {
      setError('약속 시간은 지금보다 이후로 정해줘.');
      return;
    }
    if (values.durationMinutes < 30 || values.durationMinutes > 1440) {
      setError('예상 시간은 30분에서 1440분 사이로 입력해줘.');
      return;
    }

    setError(null);
    try {
      await onSave({
        ...values,
        title,
        description: values.description.trim(),
        location: values.location.trim(),
        locationAddress: values.locationAddress?.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '일정을 저장하지 못했어.');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      fullScreen={fullScreen}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      aria-labelledby="chat-schedule-form-title"
    >
      <DialogTitle id="chat-schedule-form-title" sx={{ pr: 7 }}>
        {schedule ? '약속 수정하기' : '새 약속 만들기'}
        <IconButton
          aria-label="닫기"
          onClick={onClose}
          disabled={saving}
          sx={{ position: 'absolute', right: 12, top: 12 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.25} sx={{ pt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="약속 이름"
            value={values.title}
            onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
            inputProps={{ maxLength: 80 }}
            autoFocus={!fullScreen}
            required
            fullWidth
            disabled={saving}
          />
          <TextField
            label="함께 볼 메모"
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            inputProps={{ maxLength: 500 }}
            minRows={3}
            multiline
            fullWidth
            disabled={saving}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="날짜와 시간"
              type="datetime-local"
              value={values.startsAt}
              onChange={(event) => setValues((current) => ({ ...current, startsAt: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              disabled={saving}
            />
            <TextField
              label="예상 시간(분)"
              type="number"
              value={values.durationMinutes}
              onChange={(event) => setValues((current) => ({
                ...current,
                durationMinutes: Number(event.target.value),
              }))}
              inputProps={{ min: 30, max: 1440, step: 30 }}
              sx={{ width: { sm: 180 } }}
              required
              disabled={saving}
            />
          </Stack>
          <MapLocationPicker
            value={values.location || values.locationAddress ? {
              placeName: values.location,
              address: values.locationAddress,
              latitude: values.latitude,
              longitude: values.longitude,
              kakaoPlaceId: values.kakaoPlaceId,
            } : null}
            onChange={(selection) => setValues((current) => ({
              ...current,
              location: selection?.placeName ?? '',
              locationAddress: selection?.address,
              latitude: selection?.latitude,
              longitude: selection?.longitude,
              kakaoPlaceId: selection?.kakaoPlaceId,
            }))}
            allowCurrentLocation
            disabled={saving}
            helperText="모임 채팅방 멤버에게 공유할 카페·공원 같은 장소를 선택해줘."
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 2, py: 1.5, pb: 'max(12px, env(safe-area-inset-bottom))' }}>
        <Button onClick={onClose} disabled={saving}>닫기</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? '저장하는 중…' : schedule ? '수정하기' : '약속 만들기'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChatScheduleFormDialog;
