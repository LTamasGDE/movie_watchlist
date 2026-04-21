export type WatchStatus = "want_to_watch" | "watching" | "watched";

export type Movie = {
  id: number;
  title: string;
  director: string | null;
  year: number | null;
  genre: string | null;
  description: string | null;
  poster_url: string | null;
  created_at?: string;
  watchlist_status?: WatchStatus | null;
  rating_score?: number | null;
  rating_review?: string | null;
};

export type WatchlistItem = Movie & {
  watchlist_id: number;
  movie_id: number;
  status: WatchStatus;
  added_at: string;
};

export type Rating = {
  id: number;
  movie_id: number;
  score: number;
  review: string | null;
  rated_at: string;
  title: string;
  director: string | null;
  year: number | null;
  genre: string | null;
};

export type RatingsStats = {
  count: number;
  average: number | null;
  distribution: Record<string, number>;
};
