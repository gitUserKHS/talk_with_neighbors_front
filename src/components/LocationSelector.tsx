import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { Location } from '../store/types';

interface LocationSelectorProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
  disabled?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelect,
  initialLocation,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState(initialLocation?.address || '');
  const [latitude, setLatitude] = useState(initialLocation?.latitude?.toString() || '');
  const [longitude, setLongitude] = useState(initialLocation?.longitude?.toString() || '');
  const [error, setError] = useState<string | null>(null);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('브라우저가 현재 위치를 지원하지 않아.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toString());
        setLongitude(position.coords.longitude.toString());
        if (!address) {
          setAddress('현재 위치');
        }
        setError(null);
      },
      () => setError('현재 위치를 가져오지 못했어.')
    );
  };

  const handleConfirm = () => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!address.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('주소, 위도, 경도를 모두 입력해줘.');
      return;
    }

    onLocationSelect({
      address: address.trim(),
      latitude: lat,
      longitude: lng,
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => setOpen(true)}
        startIcon={<MyLocationIcon />}
        disabled={disabled}
      >
        {initialLocation?.address || '위치 선택'}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>위치 선택</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              label="주소"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="예: 서울시 마포구"
              fullWidth
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="위도"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
                fullWidth
              />
              <TextField
                label="경도"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
                fullWidth
              />
            </Box>
            <Button variant="outlined" startIcon={<MyLocationIcon />} onClick={handleCurrentLocation}>
              현재 위치 사용
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>취소</Button>
          <Button variant="contained" onClick={handleConfirm}>
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LocationSelector;
