import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import SearchIcon from '@mui/icons-material/Search';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationSelectorProps {
  onLocationSelect: (location: Location) => void;
  initialLocation?: Location;
}

const KAKAO_MAP_API_KEY = process.env.REACT_APP_KAKAO_MAP_API_KEY;

const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelect,
  initialLocation,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initializeMap = async () => {
    if (!mapRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // 카카오맵이 이미 초기화되어 있는지 확인
      if (!window.kakao?.maps) {
        const script = document.createElement('script');
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&libraries=services&autoload=false`;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('카카오맵 스크립트 로딩 실패'));
          document.head.appendChild(script);
        });

        // 스크립트 로드 후 카카오맵 초기화
        await new Promise<void>((resolve) => {
          window.kakao.maps.load(() => {
            resolve();
          });
        });
      }

      // 맵 생성
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 5,
      };

      const mapInstance = new window.kakao.maps.Map(mapRef.current, options);
      const markerInstance = new window.kakao.maps.Marker({
        position: mapInstance.getCenter(),
      });

      markerInstance.setMap(mapInstance);

      // 초기 위치 설정
      if (initialLocation) {
        const position = new window.kakao.maps.LatLng(
          initialLocation.latitude,
          initialLocation.longitude
        );
        mapInstance.setCenter(position);
        markerInstance.setPosition(position);
        setSelectedLocation(initialLocation);
      }

      // 클릭 이벤트 리스너 설정
      window.kakao.maps.event.addListener(mapInstance, 'click', function(mouseEvent: any) {
        const latlng = mouseEvent.latLng;
        markerInstance.setPosition(latlng);
        
        const geocoder = new window.kakao.maps.services.Geocoder();
        geocoder.coord2Address(latlng.getLng(), latlng.getLat(), (result: any, status: any) => {
          if (status === window.kakao.maps.services.Status.OK) {
            const addr = result[0].address.address_name;
            setSelectedLocation({
              latitude: latlng.getLat(),
              longitude: latlng.getLng(),
              address: addr,
            });
          }
        });
      });

      mapInstanceRef.current = mapInstance;
      markerInstanceRef.current = markerInstance;
      setIsLoading(false);
    } catch (error) {
      console.error('Map initialization error:', error);
      setError(error instanceof Error ? error.message : '지도를 불러오는데 실패했습니다.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isDialogOpen) {
      const timer = setTimeout(() => {
        initializeMap();
      }, 100); // 약간의 지연을 주어 DOM이 완전히 준비되도록 함

      return () => {
        clearTimeout(timer);
      };
    }

    return () => {
      if (!isDialogOpen) {
        if (mapInstanceRef.current) {
          window.kakao?.maps?.event?.removeAllEventHandlers?.(mapInstanceRef.current);
        }
        if (markerInstanceRef.current) {
          markerInstanceRef.current.setMap(null);
        }
        mapInstanceRef.current = null;
        markerInstanceRef.current = null;
      }
    };
  }, [isDialogOpen, initialLocation]);

  const handleDialogClose = () => {
    setIsDialogOpen(false);
  };

  const handleCurrentLocation = () => {
    if (!mapInstanceRef.current || !markerInstanceRef.current) {
      setError('지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPosition = new window.kakao.maps.LatLng(latitude, longitude);
          
          mapInstanceRef.current.setCenter(newPosition);
          markerInstanceRef.current.setPosition(newPosition);

          // 좌표를 주소로 변환
          const geocoder = new window.kakao.maps.services.Geocoder();
          geocoder.coord2Address(longitude, latitude, (result: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK) {
              const addr = result[0].address.address_name;
              setSelectedLocation({
                latitude,
                longitude,
                address: addr,
              });
            }
          });
        },
        () => {
          setError('위치 정보를 가져올 수 없습니다.');
        }
      );
    } else {
      setError('브라우저가 위치 정보를 지원하지 않습니다.');
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim() || !mapInstanceRef.current || !markerInstanceRef.current) {
      setError('지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(searchQuery, (result: any, status: any) => {
      if (status === window.kakao.maps.services.Status.OK) {
        const { x, y } = result[0];
        const position = new window.kakao.maps.LatLng(y, x);
        
        mapInstanceRef.current.setCenter(position);
        markerInstanceRef.current.setPosition(position);

        setSelectedLocation({
          latitude: parseFloat(y),
          longitude: parseFloat(x),
          address: result[0].address_name,
        });
      } else {
        setError('검색 결과를 찾을 수 없습니다.');
      }
    });
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        onClick={() => setIsDialogOpen(true)}
        startIcon={<MyLocationIcon />}
      >
        {selectedLocation ? selectedLocation.address : '위치 선택'}
      </Button>

      <Dialog
        open={isDialogOpen}
        onClose={handleDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>위치 선택</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="주소 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              disabled={isLoading}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              startIcon={<SearchIcon />}
              disabled={isLoading}
            >
              검색
            </Button>
            <Button
              variant="outlined"
              onClick={handleCurrentLocation}
              startIcon={<MyLocationIcon />}
              disabled={isLoading}
            >
              현재 위치
            </Button>
          </Box>

          <Box
            ref={mapRef}
            sx={{
              width: '100%',
              height: '400px',
              backgroundColor: '#f5f5f5',
              position: 'relative',
            }}
          >
            {isLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 1,
                }}
              >
                <CircularProgress />
              </Box>
            )}
          </Box>

          {selectedLocation && (
            <Typography sx={{ mt: 2 }}>
              선택된 위치: {selectedLocation.address}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>취소</Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={!selectedLocation || isLoading}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default LocationSelector; 