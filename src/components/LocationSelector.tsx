import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { Location } from '../store/types';
import { MapLocationSelection } from '../types/location';
import MapLocationPicker from './MapLocationPicker';

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
  const [selection, setSelection] = useState<MapLocationSelection | null>(
    initialLocation ? {
      placeName: initialLocation.address || '선택한 위치',
      address: initialLocation.address,
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
    } : null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setSelection(initialLocation ? {
      placeName: initialLocation.address || '선택한 위치',
      address: initialLocation.address,
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
    } : null);
    setError(null);
    setOpen(true);
  };

  const handleConfirm = () => {
    const address = selection?.address?.trim() || selection?.placeName.trim();
    if (
      !address
      || selection?.latitude === undefined
      || selection.longitude === undefined
    ) {
      setError('카카오 지도에서 동네를 선택하거나 HTTPS 현재 위치 권한을 허용해줘.');
      return;
    }

    onLocationSelect({
      address,
      latitude: selection.latitude,
      longitude: selection.longitude,
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpen}
        startIcon={<MyLocationIcon />}
        disabled={disabled}
      >
        {initialLocation?.address || '위치 선택'}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>동네 위치 선택</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <MapLocationPicker
              value={selection}
              onChange={(nextSelection) => {
                setSelection(nextSelection);
                setError(null);
              }}
              allowCurrentLocation
              requireCoordinates
              helperText="동네 중심이나 가까운 공공장소를 선택해줘. 정확한 좌표는 다른 사용자에게 직접 공개되지 않아."
            />
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
