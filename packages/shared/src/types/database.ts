/** Database row types matching the Supabase schema */

export interface Account {
  id: string;
  username: string;
  full_name: string | null;
  profile_pic_url: string | null;
  follower_count: number | null;
  biography: string | null;
  active: boolean;
  last_scraped_at: string | null;
  created_at: string;
}

export interface Reel {
  id: string;
  instagram_id: string;
  url: string;
  thumbnail_url: string | null;
  video_url: string | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  author_username: string | null;
  author_full_name: string | null;
  description: string | null;
  hashtags: string[];
  audio_track: string | null;
  audio_id: string | null;
  is_original_audio: boolean;
  video_duration: number | null;
  follower_count: number;
  posted_at: string | null;
  scraped_at: string;
  viral_score: number;
  is_rising_star: boolean;
}

export interface ReelAccount {
  reel_id: string;
  account_id: string;
}

export interface Category {
  id: string;
  name: string;
  created_at: string;
}

export interface AccountCategory {
  account_id: string;
  category_id: string;
}

/** Insert types (omit auto-generated fields) */
export type AccountInsert = Omit<Account, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type ReelInsert = Omit<Reel, "id" | "scraped_at"> & {
  id?: string;
  scraped_at?: string;
};

export type CategoryInsert = Omit<Category, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

/** Update types (all fields optional except id) */
export type AccountUpdate = Partial<Omit<Account, "id">> & { id: string };
export type ReelUpdate = Partial<Omit<Reel, "id">> & { id: string };
export type CategoryUpdate = Partial<Omit<Category, "id">> & { id: string };

/** Reel with associated accounts for API responses */
export interface ReelWithAccounts extends Reel {
  accounts?: Account[];
}

/** Supabase generated Database type shape */
export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: Account;
        Insert: AccountInsert;
        Update: Partial<AccountInsert>;
      };
      reels: {
        Row: Reel;
        Insert: ReelInsert;
        Update: Partial<ReelInsert>;
      };
      reel_accounts: {
        Row: ReelAccount;
        Insert: ReelAccount;
        Update: Partial<ReelAccount>;
      };
      categories: {
        Row: Category;
        Insert: CategoryInsert;
        Update: Partial<CategoryInsert>;
      };
      account_categories: {
        Row: AccountCategory;
        Insert: AccountCategory;
        Update: Partial<AccountCategory>;
      };
    };
  };
}
