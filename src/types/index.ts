
export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  mediaURL: string;
  mediaType: 'image' | 'video';
  caption: string;
  timestamp: any;
  likes: string[];
  likeCount: number;
  comments: Comment[];
  commentCount: number;
  location?: string;
  category?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: Date;
}

export interface Reel {
  id: number;
  userId: string;
  username: string;
  userAvatar?: string;
  videoURL: string;
  caption: string;
  timestamp: any;
  likes: string[];
  likeCount: number;
  comments: Comment[];
  commentCount: number;
  isLiked?: boolean;
  isSaved?: boolean;
  isFollowing?: boolean;
}
