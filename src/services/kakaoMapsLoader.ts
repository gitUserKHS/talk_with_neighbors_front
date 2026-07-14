export interface KakaoLatLng {
  getLat(): number;
  getLng(): number;
}

export interface KakaoMap {
  setCenter(position: KakaoLatLng): void;
  relayout(): void;
}

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void;
  setPosition(position: KakaoLatLng): void;
}

export interface KakaoMapMouseEvent {
  latLng: KakaoLatLng;
}

export interface KakaoPlaceSearchResult {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
}

export interface KakaoAddressSearchResult {
  address_name: string;
  x: string;
  y: string;
  road_address?: {
    address_name: string;
    building_name?: string;
  } | null;
  address?: {
    address_name: string;
  } | null;
}

export interface KakaoReverseGeocodeResult {
  road_address?: {
    address_name: string;
    building_name?: string;
  } | null;
  address: {
    address_name: string;
  };
}

type SearchCallback<T> = (results: T[], status: string) => void;

export interface KakaoMapsNamespace {
  load(callback: () => void): void;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  Marker: new (options?: { map?: KakaoMap; position?: KakaoLatLng }) => KakaoMarker;
  event: {
    addListener(
      target: KakaoMap,
      eventName: 'click',
      handler: (event: KakaoMapMouseEvent) => void,
    ): void;
    removeListener(
      target: KakaoMap,
      eventName: 'click',
      handler: (event: KakaoMapMouseEvent) => void,
    ): void;
  };
  services: {
    Status: {
      OK: string;
      ZERO_RESULT: string;
      ERROR: string;
    };
    Places: new () => {
      keywordSearch(query: string, callback: SearchCallback<KakaoPlaceSearchResult>): void;
    };
    Geocoder: new () => {
      addressSearch(query: string, callback: SearchCallback<KakaoAddressSearchResult>): void;
      coord2Address(
        longitude: number,
        latitude: number,
        callback: SearchCallback<KakaoReverseGeocodeResult>,
      ): void;
    };
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsNamespace };
  }
}

const SCRIPT_ID = 'kakao-maps-javascript-sdk';
let sdkPromise: Promise<KakaoMapsNamespace> | null = null;

export const kakaoMapsJavaScriptKey = () =>
  (import.meta.env.VITE_KAKAO_MAP_JAVASCRIPT_KEY as string | undefined)?.trim() ?? '';

export const buildKakaoMapsSdkUrl = (appKey: string) =>
  `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=services&autoload=false`;

const resolveLoadedNamespace = (
  resolve: (maps: KakaoMapsNamespace) => void,
  reject: (reason?: unknown) => void,
) => {
  const maps = window.kakao?.maps;
  if (!maps?.load) {
    reject(new Error('카카오 지도 SDK를 초기화하지 못했어.'));
    return;
  }

  maps.load(() => {
    const loadedMaps = window.kakao?.maps;
    if (!loadedMaps?.Map || !loadedMaps.services) {
      reject(new Error('카카오 지도 services 라이브러리를 불러오지 못했어.'));
      return;
    }
    resolve(loadedMaps);
  });
};

export const loadKakaoMaps = (appKey = kakaoMapsJavaScriptKey()): Promise<KakaoMapsNamespace> => {
  if (!appKey) {
    return Promise.reject(new Error('카카오 지도 JavaScript 키가 설정되지 않았어.'));
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('카카오 지도는 브라우저에서만 사용할 수 있어.'));
  }
  if (window.kakao?.maps?.Map && window.kakao.maps.services) {
    return Promise.resolve(window.kakao.maps);
  }
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<KakaoMapsNamespace>((resolve, reject) => {
    const fail = (reason?: unknown) => {
      sdkPromise = null;
      reject(reason);
    };
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');

    const handleLoad = () => resolveLoadedNamespace(resolve, fail);
    const handleError = () => {
      if (!existing) script.remove();
      fail(new Error('카카오 지도 SDK를 불러오지 못했어. 네트워크와 등록 도메인을 확인해줘.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    if (!existing) {
      script.id = SCRIPT_ID;
      script.async = true;
      script.src = buildKakaoMapsSdkUrl(appKey);
      document.head.appendChild(script);
    } else if (window.kakao?.maps?.load) {
      handleLoad();
    }
  });

  return sdkPromise;
};
