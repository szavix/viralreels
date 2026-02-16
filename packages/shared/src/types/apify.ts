/** A single post/reel from the latestPosts array in the profile scraper output */
export interface ApifyReelResult {
  id: string;
  type: "Video" | "Image" | "Sidecar";
  shortCode: string;
  caption: string;
  hashtags: string[];
  mentions: string[];
  url: string;
  commentsCount: number;
  firstComment?: string;
  latestComments?: ApifyComment[];
  dimensionsHeight: number;
  dimensionsWidth: number;
  displayUrl: string;
  images: string[];
  videoUrl?: string;
  likesCount: number;
  videoViewCount?: number;
  videoPlayCount?: number;
  igPlayCount?: number;
  reshareCount?: number;
  timestamp: string;
  childPosts: unknown[];
  locationName?: string;
  locationId?: string;
  ownerFullName?: string;
  ownerUsername: string;
  ownerId: string;
  productType?: string;
  videoDuration?: number;
  musicInfo?: ApifyMusicInfo;
  alt?: string | null;
  isPinned?: boolean;
  isCommentsDisabled?: boolean;
  taggedUsers?: unknown[];
}

/** Top-level result from the Instagram Profile Scraper actor */
export interface ApifyProfileResult {
  inputUrl: string;
  id: string;
  username: string;
  url: string;
  fullName: string;
  biography: string;
  followersCount: number;
  followsCount: number;
  postsCount: number;
  highlightReelCount: number;
  igtvVideoCount: number;
  isBusinessAccount: boolean;
  joinedRecently: boolean;
  private: boolean;
  verified: boolean;
  externalUrl: string | null;
  profilePicUrl: string;
  profilePicUrlHD: string;
  relatedProfiles: unknown[];
  latestPosts: ApifyReelResult[];
  latestIgtvVideos?: unknown[];
}

export interface ApifyMusicInfo {
  artist_name: string;
  song_name: string;
  uses_original_audio: boolean;
  should_mute_audio: boolean;
  should_mute_audio_reason: string;
  audio_id: string;
  audio_canonical_id?: string;
  audio_type?: string | null;
  music_info?: unknown | null;
  original_sound_info?: unknown | null;
  pinned_media_ids?: unknown | null;
}

export interface ApifyComment {
  id: string;
  text: string;
  ownerUsername: string;
  ownerProfilePicUrl: string;
  timestamp: string;
  repliesCount: number;
  replies: unknown[];
  likesCount: number;
  owner: {
    id: string;
    is_verified: boolean;
    profile_pic_url: string;
    username: string;
  };
}

/** Input configuration for the Apify instagram-profile-scraper actor */
export interface ApifyProfileScraperInput {
  usernames: string[];
}

/** Check if an Apify latestPosts item is a Reel (video clip) */
export function isReelResult(item: ApifyReelResult): boolean {
  return item.type === "Video" && item.productType === "clips";
}
