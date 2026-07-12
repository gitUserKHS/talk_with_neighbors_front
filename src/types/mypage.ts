import { FeedPost } from './feed';
import { HobbyMeetup } from './meetup';

export interface MyPageOverview {
  profileCompletion: number;
  postCount: number;
  commentCount: number;
  likedPostCount: number;
  createdMeetupCount: number;
  joinedMeetupCount: number;
}

export interface MyCommentActivity {
  id: string;
  postId: string;
  postCaption?: string;
  content: string;
  createdAt: string;
}

export interface UserPreferences {
  profileDiscoverable: boolean;
  showNeighborhood: boolean;
  matchNotificationsEnabled: boolean;
  chatNotificationsEnabled: boolean;
  meetupNotificationsEnabled: boolean;
}

export interface MyActivity {
  posts: FeedPost[];
  comments: MyCommentActivity[];
  likes: FeedPost[];
  meetups: HobbyMeetup[];
}
