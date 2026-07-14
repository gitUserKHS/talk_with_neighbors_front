import { describe, expect, it } from 'vitest';
import {
  meetupLocationFromAddress,
  meetupLocationFromPlace,
} from '../components/MapLocationPicker';
import { buildKakaoMapsSdkUrl } from './kakaoMapsLoader';

describe('Kakao Maps place contract', () => {
  it('loads the HTTPS SDK with services and deferred initialization', () => {
    expect(buildKakaoMapsSdkUrl('public+browser/key')).toBe(
      'https://dapi.kakao.com/v2/maps/sdk.js?appkey=public%2Bbrowser%2Fkey&libraries=services&autoload=false',
    );
  });

  it('maps a place result using road address and WGS84 coordinates', () => {
    expect(meetupLocationFromPlace({
      id: '18577297',
      place_name: '카카오 판교아지트',
      address_name: '경기 성남시 분당구 백현동 532',
      road_address_name: '경기 성남시 분당구 판교역로 166',
      x: '127.110306812433',
      y: '37.394245407468',
    })).toEqual({
      placeName: '카카오 판교아지트',
      address: '경기 성남시 분당구 판교역로 166',
      latitude: 37.394245407468,
      longitude: 127.110306812433,
      kakaoPlaceId: '18577297',
    });
  });

  it('supports address-only results and rejects malformed coordinates', () => {
    expect(meetupLocationFromAddress({
      address_name: '서울 중구 세종대로 110',
      x: '126.9779451',
      y: '37.5662968',
      road_address: {
        address_name: '서울 중구 세종대로 110',
        building_name: '서울도서관',
      },
    })).toMatchObject({
      placeName: '서울도서관',
      address: '서울 중구 세종대로 110',
      latitude: 37.5662968,
      longitude: 126.9779451,
    });

    expect(meetupLocationFromAddress({
      address_name: '잘못된 좌표',
      x: 'not-a-number',
      y: '37.5',
    })).toBeNull();
  });
});
