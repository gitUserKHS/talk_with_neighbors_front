import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';
import {
  KakaoAddressSearchResult,
  KakaoMap,
  KakaoMapMouseEvent,
  KakaoMapsNamespace,
  KakaoMarker,
  KakaoPlaceSearchResult,
  KakaoReverseGeocodeResult,
  kakaoMapsJavaScriptKey,
  loadKakaoMaps,
} from '../services/kakaoMapsLoader';
import { MapLocationSelection } from '../types/location';

interface MapLocationPickerProps {
  value?: MapLocationSelection | null;
  onChange: (location: MapLocationSelection | null) => void;
  disabled?: boolean;
  allowCurrentLocation?: boolean;
  requireCoordinates?: boolean;
  helperText?: string;
}

const DEFAULT_CENTER = { latitude: 37.566826, longitude: 126.9786567 };

const numberFromKakao = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const meetupLocationFromPlace = (
  place: KakaoPlaceSearchResult,
): MapLocationSelection | null => {
  const latitude = numberFromKakao(place.y);
  const longitude = numberFromKakao(place.x);
  if (latitude === undefined || longitude === undefined) return null;

  return {
    placeName: place.place_name.trim() || place.road_address_name || place.address_name,
    address: place.road_address_name || place.address_name || undefined,
    latitude,
    longitude,
    kakaoPlaceId: place.id || undefined,
  };
};

export const meetupLocationFromAddress = (
  result: KakaoAddressSearchResult,
): MapLocationSelection | null => {
  const latitude = numberFromKakao(result.y);
  const longitude = numberFromKakao(result.x);
  if (latitude === undefined || longitude === undefined) return null;

  const address = result.road_address?.address_name || result.address_name || result.address?.address_name;
  return {
    placeName: result.road_address?.building_name?.trim() || address || '지도에서 선택한 장소',
    address: address || undefined,
    latitude,
    longitude,
  };
};

const meetupLocationFromReverseGeocode = (
  result: KakaoReverseGeocodeResult,
  latitude: number,
  longitude: number,
): MapLocationSelection => {
  const address = result.road_address?.address_name || result.address.address_name;
  return {
    placeName: result.road_address?.building_name?.trim() || address || '지도에서 선택한 장소',
    address,
    latitude,
    longitude,
  };
};

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onChange,
  disabled,
  allowCurrentLocation = false,
  requireCoordinates = false,
  helperText = '공개 모임에는 집 주소 대신 카페·공원 같은 공공장소를 선택해줘.',
}) => {
  const appKey = kakaoMapsJavaScriptKey();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const mapsRef = useRef<KakaoMapsNamespace | null>(null);
  const geocoderRef = useRef<InstanceType<KakaoMapsNamespace['services']['Geocoder']> | null>(null);
  const onChangeRef = useRef(onChange);
  const searchGeneration = useRef(0);
  const [sdkState, setSdkState] = useState<'missing' | 'loading' | 'ready' | 'error'>(
    appKey ? 'loading' : 'missing',
  );
  const [sdkError, setSdkError] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [results, setResults] = useState<MapLocationSelection[]>([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const positionMarker = (selection: MapLocationSelection) => {
    if (
      selection.latitude === undefined
      || selection.longitude === undefined
      || !mapsRef.current
      || !mapRef.current
      || !markerRef.current
    ) return;

    const position = new mapsRef.current.LatLng(selection.latitude, selection.longitude);
    markerRef.current.setPosition(position);
    markerRef.current.setMap(mapRef.current);
    mapRef.current.setCenter(position);
  };

  const selectLocation = (selection: MapLocationSelection) => {
    positionMarker(selection);
    onChangeRef.current(selection);
    setStatusMessage(`${selection.placeName}을(를) 모임 장소로 선택했어.`);
    setSearchError('');
  };

  useEffect(() => {
    if (!appKey || !mapContainerRef.current) return;

    let cancelled = false;
    let map: KakaoMap | null = null;
    let marker: KakaoMarker | null = null;
    let clickHandler: ((event: KakaoMapMouseEvent) => void) | null = null;
    setSdkState('loading');

    void loadKakaoMaps(appKey)
      .then((maps) => {
        if (cancelled || !mapContainerRef.current) return;
        const latitude = value?.latitude ?? DEFAULT_CENTER.latitude;
        const longitude = value?.longitude ?? DEFAULT_CENTER.longitude;
        const center = new maps.LatLng(latitude, longitude);
        map = new maps.Map(mapContainerRef.current, { center, level: value?.latitude ? 3 : 7 });
        marker = new maps.Marker();
        mapsRef.current = maps;
        mapRef.current = map;
        markerRef.current = marker;
        geocoderRef.current = new maps.services.Geocoder();

        if (value?.latitude !== undefined && value.longitude !== undefined) {
          marker.setPosition(center);
          marker.setMap(map);
        }

        clickHandler = (event) => {
          const latitudeAtClick = event.latLng.getLat();
          const longitudeAtClick = event.latLng.getLng();
          setStatusMessage('클릭한 위치의 주소를 확인하고 있어.');
          geocoderRef.current?.coord2Address(
            longitudeAtClick,
            latitudeAtClick,
            (items, status) => {
              if (status !== maps.services.Status.OK || !items[0]) {
                setSearchError('선택한 위치의 주소를 찾지 못했어. 장소나 주소로 검색해줘.');
                return;
              }
              selectLocation(meetupLocationFromReverseGeocode(
                items[0],
                latitudeAtClick,
                longitudeAtClick,
              ));
            },
          );
        };
        maps.event.addListener(map, 'click', clickHandler);
        setSdkState('ready');
        setSdkError('');
        window.requestAnimationFrame(() => map?.relayout());
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setSdkState('error');
        setSdkError(error instanceof Error ? error.message : '카카오 지도를 불러오지 못했어.');
      });

    return () => {
      cancelled = true;
      if (map && clickHandler && mapsRef.current) {
        mapsRef.current.event.removeListener(map, 'click', clickHandler);
      }
      marker?.setMap(null);
      if (mapRef.current === map) mapRef.current = null;
      if (markerRef.current === marker) markerRef.current = null;
    };
  }, [appKey]);

  useEffect(() => {
    if (value) {
      positionMarker(value);
    } else {
      markerRef.current?.setMap(null);
    }
  }, [value]);

  const searchAddress = (
    maps: KakaoMapsNamespace,
    normalizedQuery: string,
    requestId: number,
  ) => {
    geocoderRef.current?.addressSearch(normalizedQuery, (items, status) => {
      if (requestId !== searchGeneration.current) return;
      const selections = status === maps.services.Status.OK
        ? items.map(meetupLocationFromAddress).filter((item): item is MapLocationSelection => item !== null)
        : [];
      setResults(selections);
      setSearching(false);
      setStatusMessage(selections.length > 0 ? `주소 검색 결과 ${selections.length}개를 찾았어.` : '검색 결과가 없어.');
      if (selections.length === 0) setSearchError('장소나 주소를 찾지 못했어. 검색어를 조금 더 자세히 입력해줘.');
    });
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    const maps = mapsRef.current;
    if (normalizedQuery.length < 2) {
      setSearchError('장소나 주소를 두 글자 이상 입력해줘.');
      return;
    }
    if (!maps || !geocoderRef.current) {
      setSearchError('지도가 준비된 다음 다시 검색해줘.');
      return;
    }

    const requestId = ++searchGeneration.current;
    setSearching(true);
    setSearchError('');
    setResults([]);
    setStatusMessage('장소를 검색하고 있어.');
    const places = new maps.services.Places();
    places.keywordSearch(normalizedQuery, (items, status) => {
      if (requestId !== searchGeneration.current) return;
      const selections = status === maps.services.Status.OK
        ? items.map(meetupLocationFromPlace).filter((item): item is MapLocationSelection => item !== null)
        : [];
      if (selections.length > 0) {
        setResults(selections);
        setSearching(false);
        setStatusMessage(`장소 검색 결과 ${selections.length}개를 찾았어.`);
        return;
      }
      searchAddress(maps, normalizedQuery, requestId);
    });
  };

  const handleCurrentLocation = () => {
    if (typeof window === 'undefined' || !window.isSecureContext) {
      setSearchError('현재 위치는 HTTPS 또는 localhost에서만 사용할 수 있어.');
      return;
    }
    if (!navigator.geolocation) {
      setSearchError('이 브라우저는 현재 위치 확인을 지원하지 않아.');
      return;
    }

    setLocating(true);
    setSearchError('');
    setStatusMessage('현재 위치를 확인하고 있어.');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const maps = mapsRef.current;
        const geocoder = geocoderRef.current;
        if (!maps || !geocoder) {
          selectLocation({
            placeName: '현재 위치',
            address: '현재 위치',
            latitude,
            longitude,
          });
          setLocating(false);
          return;
        }

        geocoder.coord2Address(longitude, latitude, (items, status) => {
          if (status === maps.services.Status.OK && items[0]) {
            selectLocation(meetupLocationFromReverseGeocode(items[0], latitude, longitude));
          } else {
            selectLocation({
              placeName: '현재 위치',
              address: '현재 위치',
              latitude,
              longitude,
            });
          }
          setLocating(false);
        });
      },
      () => {
        setLocating(false);
        setSearchError('현재 위치를 가져오지 못했어. 브라우저의 위치 권한을 확인해줘.');
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const updateManualLocation = (placeName: string, address: string) => {
    const normalizedPlaceName = placeName.trimStart();
    const normalizedAddress = address.trimStart();
    if (!normalizedPlaceName && !normalizedAddress) {
      onChange(null);
      return;
    }
    onChange({
      placeName: normalizedPlaceName,
      address: normalizedAddress || undefined,
    });
  };

  if (sdkState === 'missing' || sdkState === 'error') {
    return (
      <Stack spacing={1.5}>
        <Alert severity={sdkState === 'error' ? 'warning' : 'info'}>
          {sdkError || (requireCoordinates
            ? '동네 좌표 선택에는 카카오 지도 설정 또는 HTTPS 현재 위치 권한이 필요해.'
            : '지도 설정이 아직 준비되지 않아 장소명을 직접 입력할 수 있어.')}
        </Alert>
        {!requireCoordinates && (
          <>
            <TextField
              label="장소명"
              value={value?.placeName ?? ''}
              onChange={(event) => updateManualLocation(event.target.value, value?.address ?? '')}
              inputProps={{ maxLength: 100 }}
              disabled={disabled}
              fullWidth
            />
            <TextField
              label="주소 또는 장소 안내"
              value={value?.address ?? ''}
              onChange={(event) => updateManualLocation(value?.placeName ?? '', event.target.value)}
              inputProps={{ maxLength: 255 }}
              disabled={disabled}
              fullWidth
            />
          </>
        )}
        {allowCurrentLocation && (
          <>
            <Button
              variant="outlined"
              startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
              onClick={handleCurrentLocation}
              disabled={disabled || locating}
            >
              현재 위치 사용
            </Button>
            <Typography variant="caption" color="text.secondary">
              현재 위치 확인은 HTTPS 또는 localhost에서만 동작해.
            </Typography>
          </>
        )}
        <Typography variant="caption" color="text.secondary">{helperText}</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box component="form" onSubmit={handleSearch}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            label="장소 또는 주소 검색"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: 서울도서관, 망원한강공원"
            inputProps={{ 'aria-controls': results.length > 0 ? 'meetup-location-results' : undefined }}
            disabled={disabled || sdkState !== 'ready'}
            fullWidth
          />
          <Button
            type="submit"
            variant="outlined"
            startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}
            disabled={disabled || sdkState !== 'ready' || searching}
            sx={{ minWidth: 104 }}
          >
            검색
          </Button>
        </Stack>
      </Box>

      {searchError && <Alert severity="warning">{searchError}</Alert>}
      <Typography role="status" aria-live="polite" variant="caption" color="text.secondary">
        {sdkState === 'loading' ? '지도를 불러오는 중이야.' : statusMessage || '장소를 검색하거나 지도를 클릭해서 선택해줘.'}
      </Typography>

      {allowCurrentLocation && (
        <>
          <Button
            variant="outlined"
            startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
            onClick={handleCurrentLocation}
            disabled={disabled || sdkState !== 'ready' || locating}
          >
            현재 위치 사용
          </Button>
          <Typography variant="caption" color="text.secondary">
            현재 위치 확인은 HTTPS 또는 localhost에서만 동작해.
          </Typography>
        </>
      )}

      {results.length > 0 && (
        <List id="meetup-location-results" aria-label="장소 검색 결과" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, py: 0 }}>
          {results.map((result) => (
            <ListItem
              key={result.kakaoPlaceId ?? `${result.latitude}-${result.longitude}`}
              disablePadding
            >
              <ListItemButton onClick={() => selectLocation(result)} disabled={disabled}>
                <Stack>
                  <Typography fontWeight={700}>{result.placeName}</Typography>
                  {result.address && <Typography variant="body2" color="text.secondary">{result.address}</Typography>}
                </Stack>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}

      <Box
        ref={mapContainerRef}
        role="region"
        aria-label="모임 장소 지도. 지도를 클릭하면 그 위치를 선택해."
        sx={{ width: '100%', height: 280, borderRadius: 1.5, overflow: 'hidden', bgcolor: 'action.hover' }}
      />

      {value?.placeName && (
        <Alert
          severity="success"
          icon={<LocationOnOutlinedIcon />}
          action={<Button color="inherit" size="small" onClick={() => onChange(null)} disabled={disabled}>지우기</Button>}
        >
          <Typography variant="subtitle2" fontWeight={800}>{value.placeName}</Typography>
          {value.address && <Typography variant="body2">{value.address}</Typography>}
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary">
        {helperText}
      </Typography>
    </Stack>
  );
};

export default MapLocationPicker;
