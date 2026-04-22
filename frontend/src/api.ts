import type { Movie, Rating, RatingsStats, WatchStatus, WatchlistItem } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

type MoviesResponse = {
  data: Movie[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
    pages: number;
  };
};

type WatchlistResponse = {
  total: number;
  items: WatchlistItem[];
  groups: Record<WatchStatus, WatchlistItem[]>;
};

type RatingsResponse = {
  data: Rating[];
  stats: RatingsStats;
};

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const backendError = String(payload.error ?? "");
      if (backendError.toLowerCase().includes("could not find driver")) {
        throw new Error(
          "A backendben nincs bekapcsolva az SQLite driver (pdo_sqlite). Engedélyezd a PHP SQLite bővítményt.",
        );
      }
      throw new Error(backendError || "Ismeretlen API hiba.");
    }
    return payload as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Nem érhető el a backend API. Ellenőrizd, hogy fut-e a PHP szerver a 8000-es porton.");
    }
    throw error;
  }
}

export const api = {
  listMovies: (params: URLSearchParams) =>
    apiRequest<MoviesResponse>(`/movies?${params.toString()}`),
  createMovie: (movie: Partial<Movie>) =>
    apiRequest<Movie>("/movies", { method: "POST", body: JSON.stringify(movie) }),
  updateMovie: (id: number, movie: Partial<Movie>) =>
    apiRequest<Movie>(`/movies/${id}`, { method: "PUT", body: JSON.stringify(movie) }),
  deleteMovie: (id: number) => apiRequest<{ message: string }>(`/movies/${id}`, { method: "DELETE" }),
  listWatchlist: () => apiRequest<WatchlistResponse>("/watchlist"),
  addWatchlist: (movieId: number, status: WatchStatus) =>
    apiRequest<WatchlistItem>("/watchlist", {
      method: "POST",
      body: JSON.stringify({ movie_id: movieId, status }),
    }),
  updateWatchlistStatus: (movieId: number, status: WatchStatus) =>
    apiRequest<WatchlistItem>(`/watchlist/${movieId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  removeWatchlist: (movieId: number) =>
    apiRequest<{ message: string }>(`/watchlist/${movieId}`, { method: "DELETE" }),
  listRatings: () => apiRequest<RatingsResponse>("/ratings"),
  upsertRating: (movieId: number, score: number, review: string) =>
    apiRequest<Rating>("/ratings", {
      method: "POST",
      body: JSON.stringify({ movie_id: movieId, score, review }),
    }),
  deleteRating: (movieId: number) =>
    apiRequest<{ message: string }>(`/ratings/${movieId}`, { method: "DELETE" }),
};
