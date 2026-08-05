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
import { translate, useI18n } from '../i18n/I18nProvider';

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
  fallbackPlaceName = translate('지도에서 선택한 장소', 'Location selected on the map'),
): MapLocationSelection | null => {
  const latitude = numberFromKakao(result.y);
  const longitude = numberFromKakao(result.x);
  if (latitude === undefined || longitude === undefined) return null;

  const address = result.road_address?.address_name || result.address_name || result.address?.address_name;
  return {
    placeName: result.road_address?.building_name?.trim() || address || fallbackPlaceName,
    address: address || undefined,
    latitude,
    longitude,
  };
};

const meetupLocationFromReverseGeocode = (
  result: KakaoReverseGeocodeResult,
  latitude: number,
  longitude: number,
  fallbackPlaceName = translate('지도에서 선택한 장소', 'Location selected on the map'),
): MapLocationSelection => {
  const address = result.road_address?.address_name || result.address.address_name;
  return {
    placeName: result.road_address?.building_name?.trim() || address || fallbackPlaceName,
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
  helperText,
}) => {
  const { t, formatNumber } = useI18n();
  const resolvedHelperText = helperText ?? t(
    '공개 모임에는 집 주소 대신 카페나 공원 같은 공공장소를 선택해 주세요.',
    'For public meetups, choose a public place such as a cafe or park instead of a home address.',
  );
  const translateRef = useRef(t);
  translateRef.current = t;
  const appKey = kakaoMapsJavaScriptKey();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const mapsRef = useRef<KakaoMapsNamespace | null>(null);
  const geocoderRef = useRef<InstanceType<KakaoMapsNamespace['services']['Geocoder']> | null>(null);
  const onChangeRef = useRef(onChange);
  const searchGeneration = useRef(0);
  const searchInFlight = useRef(false);
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
    setStatusMessage(translateRef.current(
      `${selection.placeName}을(를) 모임 장소로 선택했습니다.`,
      `${selection.placeName} has been selected as the meetup location.`,
    ));
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
          setStatusMessage(translateRef.current(
            '선택한 위치의 주소를 확인하고 있습니다.',
            'Finding the address for the selected point…',
          ));
          geocoderRef.current?.coord2Address(
            longitudeAtClick,
            latitudeAtClick,
            (items, status) => {
              if (status !== maps.services.Status.OK || !items[0]) {
                setSearchError(translateRef.current(
                  '선택한 위치의 주소를 찾지 못했습니다. 장소명이나 주소로 검색해 주세요.',
                  'We could not find an address for that point. Search by place name or address instead.',
                ));
                return;
              }
              selectLocation(meetupLocationFromReverseGeocode(
                items[0],
                latitudeAtClick,
                longitudeAtClick,
                translateRef.current('지도에서 선택한 장소', 'Location selected on the map'),
              ));
            },
          );
        };
        maps.event.addListener(map, 'click', clickHandler);
        setSdkState('ready');
        setSdkError('');
        window.requestAnimationFrame(() => map?.relayout());
      })
      .catch((_error: unknown) => {
        if (cancelled) return;
        setSdkState('error');
        setSdkError(translateRef.current(
          '카카오 지도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
          'Kakao Map could not be loaded. Please try again shortly.',
        ));
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
        ? items
          .map((item) => meetupLocationFromAddress(
            item,
            translateRef.current('지도에서 선택한 장소', 'Location selected on the map'),
          ))
          .filter((item): item is MapLocationSelection => item !== null)
        : [];
      setResults(selections);
      searchInFlight.current = false;
      setSearching(false);
      setStatusMessage(selections.length > 0
        ? translateRef.current(
          `주소 검색 결과 ${formatNumber(selections.length)}개를 찾았습니다.`,
          `${formatNumber(selections.length)} address ${selections.length === 1 ? 'result' : 'results'} found.`,
        )
        : translateRef.current('검색 결과가 없습니다.', 'No results found.'));
      if (selections.length === 0) setSearchError(translateRef.current(
        '장소나 주소를 찾지 못했습니다. 검색어를 조금 더 자세히 입력해 주세요.',
        'No matching place or address was found. Try a more specific search.',
      ));
    });
  };

  const handleSearch = () => {
    if (searchInFlight.current) return;
    const normalizedQuery = query.trim();
    const maps = mapsRef.current;
    if (normalizedQuery.length < 2) {
      setSearchError(t(
        '장소명이나 주소를 두 글자 이상 입력해 주세요.',
        'Enter at least two characters for a place or address.',
      ));
      return;
    }
    if (!maps || !geocoderRef.current) {
      setSearchError(t(
        '지도가 준비된 후 다시 검색해 주세요.',
        'Please wait for the map to finish loading, then search again.',
      ));
      return;
    }

    const requestId = ++searchGeneration.current;
    searchInFlight.current = true;
    setSearching(true);
    setSearchError('');
    setResults([]);
    setStatusMessage(t('장소를 검색하고 있습니다.', 'Searching for places…'));
    const places = new maps.services.Places();
    places.keywordSearch(normalizedQuery, (items, status) => {
      if (requestId !== searchGeneration.current) return;
      const selections = status === maps.services.Status.OK
        ? items.map(meetupLocationFromPlace).filter((item): item is MapLocationSelection => item !== null)
        : [];
      if (selections.length > 0) {
        setResults(selections);
        searchInFlight.current = false;
        setSearching(false);
        setStatusMessage(t(
          `장소 검색 결과 ${formatNumber(selections.length)}개를 찾았습니다.`,
          `${formatNumber(selections.length)} place ${selections.length === 1 ? 'result' : 'results'} found.`,
        ));
        return;
      }
      searchAddress(maps, normalizedQuery, requestId);
    });
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;

    event.preventDefault();
    event.stopPropagation();
    if (event.nativeEvent.isComposing || event.repeat) return;
    handleSearch();
  };

  const handleCurrentLocation = () => {
    if (typeof window === 'undefined' || !window.isSecureContext) {
      setSearchError(t(
        '현재 위치 기능은 HTTPS 또는 localhost에서만 사용할 수 있습니다.',
        'Current location is available only over HTTPS or on localhost.',
      ));
      return;
    }
    if (!navigator.geolocation) {
      setSearchError(t(
        '이 브라우저에서는 현재 위치를 확인할 수 없습니다.',
        'This browser does not support location access.',
      ));
      return;
    }

    setLocating(true);
    setSearchError('');
    setStatusMessage(t('현재 위치를 확인하고 있습니다.', 'Finding your current location…'));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const maps = mapsRef.current;
        const geocoder = geocoderRef.current;
        if (!maps || !geocoder) {
          selectLocation({
            placeName: t('현재 위치', 'Current location'),
            address: t('현재 위치', 'Current location'),
            latitude,
            longitude,
          });
          setLocating(false);
          return;
        }

        geocoder.coord2Address(longitude, latitude, (items, status) => {
          if (status === maps.services.Status.OK && items[0]) {
            selectLocation(meetupLocationFromReverseGeocode(
              items[0],
              latitude,
              longitude,
              t('지도에서 선택한 장소', 'Location selected on the map'),
            ));
          } else {
            selectLocation({
              placeName: t('현재 위치', 'Current location'),
              address: t('현재 위치', 'Current location'),
              latitude,
              longitude,
            });
          }
          setLocating(false);
        });
      },
      () => {
        setLocating(false);
        setSearchError(t(
          '현재 위치를 가져오지 못했습니다. 브라우저의 위치 권한을 확인해 주세요.',
          'Your current location could not be retrieved. Check your browser location permission.',
        ));
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

  const preventParentSubmitOnEnter = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    event.stopPropagation();
  };

  if (sdkState === 'missing' || sdkState === 'error') {
    return (
      <Stack spacing={1.5}>
        <Alert severity={sdkState === 'error' ? 'warning' : 'info'}>
          {sdkError || (requireCoordinates
            ? t(
              '동네 위치를 선택하려면 카카오 지도 설정 또는 현재 위치 권한이 필요합니다.',
              'Kakao Map configuration or current-location permission is required to choose a neighborhood.',
            )
            : t(
              '지도를 사용할 수 없어 장소 정보를 직접 입력할 수 있습니다.',
              'The map is unavailable, but you can enter the place details manually.',
            ))}
        </Alert>
        {!requireCoordinates && (
          <>
            <TextField
              label={t('장소명', 'Place name')}
              value={value?.placeName ?? ''}
              onChange={(event) => updateManualLocation(event.target.value, value?.address ?? '')}
              onKeyDown={preventParentSubmitOnEnter}
              inputProps={{ maxLength: 100 }}
              disabled={disabled}
              fullWidth
            />
            <TextField
              label={t('주소 또는 장소 안내', 'Address or directions')}
              value={value?.address ?? ''}
              onChange={(event) => updateManualLocation(value?.placeName ?? '', event.target.value)}
              onKeyDown={preventParentSubmitOnEnter}
              inputProps={{ maxLength: 255 }}
              disabled={disabled}
              fullWidth
            />
          </>
        )}
        {allowCurrentLocation && (
          <>
            <Button
              type="button"
              variant="outlined"
              startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
              onClick={handleCurrentLocation}
              disabled={disabled || locating}
            >
              {t('현재 위치 사용', 'Use current location')}
            </Button>
            <Typography variant="caption" color="text.secondary">
              {t(
                '현재 위치 기능은 HTTPS 또는 localhost에서만 사용할 수 있습니다.',
                'Current location is available only over HTTPS or on localhost.',
              )}
            </Typography>
          </>
        )}
        <Typography variant="caption" color="text.secondary">{resolvedHelperText}</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Box role="search" aria-label={t('장소 또는 주소 검색', 'Search for a place or address')}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TextField
            label={t('장소 또는 주소 검색', 'Search for a place or address')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('예: 서울도서관, 망원한강공원', 'e.g. Seoul Metropolitan Library')}
            inputProps={{ 'aria-controls': results.length > 0 ? 'meetup-location-results' : undefined }}
            disabled={disabled || sdkState !== 'ready'}
            fullWidth
          />
          <Button
            type="button"
            onClick={handleSearch}
            variant="outlined"
            startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}
            disabled={disabled || sdkState !== 'ready' || searching}
            sx={{ minWidth: 104 }}
          >
            {t('검색', 'Search')}
          </Button>
        </Stack>
      </Box>

      {searchError && <Alert severity="warning">{searchError}</Alert>}
      <Typography role="status" aria-live="polite" variant="caption" color="text.secondary">
        {sdkState === 'loading'
          ? t('지도를 불러오고 있습니다.', 'Loading map…')
          : statusMessage || t(
            '장소를 검색하거나 지도를 클릭해 선택해 주세요.',
            'Search for a place or click the map to choose a location.',
          )}
      </Typography>

      {allowCurrentLocation && (
        <>
          <Button
            type="button"
            variant="outlined"
            startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
            onClick={handleCurrentLocation}
            disabled={disabled || sdkState !== 'ready' || locating}
          >
            {t('현재 위치 사용', 'Use current location')}
          </Button>
          <Typography variant="caption" color="text.secondary">
            {t(
              '현재 위치 기능은 HTTPS 또는 localhost에서만 사용할 수 있습니다.',
              'Current location is available only over HTTPS or on localhost.',
            )}
          </Typography>
        </>
      )}

      {results.length > 0 && (
        <List id="meetup-location-results" aria-label={t('장소 검색 결과', 'Place search results')} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, py: 0, overflow: 'hidden' }}>
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
        aria-label={t(
          '모임 장소 지도입니다. 지도를 클릭하면 위치를 선택할 수 있습니다.',
          'Meetup location map. Click the map to choose a location.',
        )}
        sx={{ width: '100%', height: { xs: 240, sm: 300 }, borderRadius: 2.5, overflow: 'hidden', bgcolor: 'action.hover', border: 1, borderColor: 'divider' }}
      />

      {value?.placeName && (
        <Alert
          severity="success"
          icon={<LocationOnOutlinedIcon />}
          action={<Button type="button" color="inherit" size="small" onClick={() => onChange(null)} disabled={disabled}>{t('지우기', 'Clear')}</Button>}
        >
          <Typography variant="subtitle2" fontWeight={800}>{value.placeName}</Typography>
          {value.address && <Typography variant="body2">{value.address}</Typography>}
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary">
        {resolvedHelperText}
      </Typography>
    </Stack>
  );
};

export default MapLocationPicker;
