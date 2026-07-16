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
import { useI18n } from '../i18n/I18nProvider';

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
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<MapLocationSelection | null>(
    initialLocation ? {
      placeName: initialLocation.address || t('선택한 위치', 'Selected location'),
      address: initialLocation.address,
      latitude: initialLocation.latitude,
      longitude: initialLocation.longitude,
    } : null,
  );
  const [error, setError] = useState<string | null>(null);

  const handleOpen = () => {
    setSelection(initialLocation ? {
      placeName: initialLocation.address || t('선택한 위치', 'Selected location'),
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
      setError(t(
        '카카오 지도에서 동네를 선택하거나 현재 위치 권한을 허용해 주세요.',
        'Select your neighborhood on Kakao Map or allow access to your current location.',
      ));
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
        {initialLocation?.address || t('위치 선택', 'Choose location')}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('동네 위치 선택', 'Choose your neighborhood')}</DialogTitle>
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
              helperText={t(
                '동네 중심이나 가까운 공공장소를 선택해 주세요. 정확한 좌표는 다른 사용자에게 공개되지 않습니다.',
                'Choose the center of your neighborhood or a nearby public place. Your exact coordinates are not shown to other users.',
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t('취소', 'Cancel')}</Button>
          <Button variant="contained" onClick={handleConfirm}>
            {t('이 위치 사용', 'Use this location')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LocationSelector;
