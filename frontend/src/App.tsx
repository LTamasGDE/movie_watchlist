import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api";
import { CustomSelect } from "./CustomSelect";
import type { Movie, Rating, WatchStatus, WatchlistItem } from "./types";

const THEME_KEY = "mw-theme";

type ThemeMode = "dark" | "light";

function readStoredTheme(): ThemeMode {
  try {
    const s = localStorage.getItem(THEME_KEY);
    if (s === "light" || s === "dark") return s;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function navTabClass({ isActive }: { isActive: boolean }) {
  return isActive ? "tab active" : "tab";
}

const STATUS_LABELS: Record<WatchStatus, string> = {
  want_to_watch: "Megnézném",
  watching: "Nézem",
  watched: "Megnézve",
};

const VALIDATION = {
  movieTitle: "Add meg a film címét.",
  pickMovieForRating: "Válassz filmet a listából.",
} as const;

const FILTER_STATUS_OPTIONS = [
  { value: "", label: "Minden státusz" },
  { value: "want_to_watch", label: STATUS_LABELS.want_to_watch },
  { value: "watching", label: STATUS_LABELS.watching },
  { value: "watched", label: STATUS_LABELS.watched },
];

const WATCH_STATUS_OPTIONS: { value: WatchStatus; label: string }[] = [
  { value: "want_to_watch", label: STATUS_LABELS.want_to_watch },
  { value: "watching", label: STATUS_LABELS.watching },
  { value: "watched", label: STATUS_LABELS.watched },
];

function clearFieldValidity(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
  e.currentTarget.setCustomValidity("");
}

function PosterMedia({ title, url, compact }: { title: string; url: string | null; compact?: boolean }) {
  const [broken, setBroken] = useState(!url);
  const initial = title.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={compact ? "list-thumb" : "movie-media"}>
      {url && !broken ? (
        <img src={url} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
      ) : null}
      {(!url || broken) && !compact ? <div className="poster-fallback">{initial}</div> : null}
      {(!url || broken) && compact ? <div className="poster-fallback">{initial}</div> : null}
    </div>
  );
}

function StarRow({ score }: { score: number }) {
  const filled = Math.min(10, Math.max(0, Math.round(score)));
  return (
    <p className="stars-row" aria-label={`${score} / 10 csillag`}>
      {Array.from({ length: 10 }, (_, i) => (i < filled ? "★" : "☆")).join("")}
    </p>
  );
}

const emptyMovie = {
  title: "",
  director: "",
  year: "",
  genre: "",
  description: "",
  poster_url: "",
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState<ThemeMode>(readStoredTheme);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [movies, setMovies] = useState<Movie[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 9, pages: 1 });
  const [filters, setFilters] = useState({ search: "", genre: "", year: "", status: "" });
  const [watchlist, setWatchlist] = useState<Record<WatchStatus, WatchlistItem[]>>({
    watching: [],
    want_to_watch: [],
    watched: [],
  });
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [stats, setStats] = useState({ count: 0, average: null as number | null, distribution: {} as Record<string, number> });
  const [form, setForm] = useState(emptyMovie);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [ratingDraft, setRatingDraft] = useState({ movieId: 0, score: 8, review: "" });
  const [ratingMovieInvalid, setRatingMovieInvalid] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const refreshAll = async () => {
    await Promise.all([loadMovies(pagination.page, { quiet: true }), loadWatchlist(), loadRatings()]);
  };

  const loadMovies = async (page = 1, options?: { quiet?: boolean }) => {
    const quiet = options?.quiet ?? false;
    if (!quiet) setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(pagination.per_page),
      });
      if (filters.search) params.set("search", filters.search);
      if (filters.genre) params.set("genre", filters.genre);
      if (filters.year) params.set("year", filters.year);
      if (filters.status) params.set("status", filters.status);

      const data = await api.listMovies(params);
      setMovies(data.data);
      setPagination(data.pagination);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const loadWatchlist = async () => {
    try {
      const data = await api.listWatchlist();
      setWatchlist(data.groups);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const loadRatings = async () => {
    try {
      const data = await api.listRatings();
      setRatings(data.data);
      setStats(data.stats);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    void (async () => {
      await Promise.all([loadMovies(1), loadWatchlist(), loadRatings()]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadMovies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.genre, filters.year, filters.status]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "Filmek",
      "/bakancslista": "Bakancslista",
      "/ertekelesek": "Értékelések",
    };
    document.title = `${titles[location.pathname] ?? "Movie Watchlist"} · Movie Watchlist`;
  }, [location.pathname]);

  const allWatchlistItems = useMemo(
    () => [...watchlist.watching, ...watchlist.want_to_watch, ...watchlist.watched],
    [watchlist],
  );

  const ratingMovieOptions = useMemo(
    () => [
      { value: "", label: "Válassz filmet" },
      ...allWatchlistItems.map((m) => ({ value: String(m.id), label: m.title })),
    ],
    [allWatchlistItems],
  );

  useEffect(() => {
    if (ratingDraft.movieId) setRatingMovieInvalid(false);
  }, [ratingDraft.movieId]);

  const watchlistTotal = allWatchlistItems.length;

  const distMax = useMemo(() => {
    const vals = Object.values(stats.distribution);
    return vals.length ? Math.max(...vals, 1) : 1;
  }, [stats.distribution]);

  const submitMovie = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const payload = {
        title: form.title,
        director: form.director,
        year: form.year ? Number(form.year) : null,
        genre: form.genre,
        description: form.description,
        poster_url: form.poster_url,
      };
      if (editingId) {
        await api.updateMovie(editingId, payload);
        showToast("A film adatai frissítve.");
      } else {
        await api.createMovie(payload);
        showToast("A film sikeresen hozzáadva.");
      }
      setForm(emptyMovie);
      setEditingId(null);
      await refreshAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const startEdit = (movie: Movie) => {
    setEditingId(movie.id);
    setForm({
      title: movie.title ?? "",
      director: movie.director ?? "",
      year: movie.year ? String(movie.year) : "",
      genre: movie.genre ?? "",
      description: movie.description ?? "",
      poster_url: movie.poster_url ?? "",
    });
    window.requestAnimationFrame(() => {
      document.getElementById("movie-form-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const removeMovie = async (id: number) => {
    if (!window.confirm("Biztosan törlöd a filmet?")) return;
    try {
      await api.deleteMovie(id);
      showToast("A film törölve.");
      await refreshAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const addToWatchlist = async (movieId: number, status: WatchStatus) => {
    try {
      await api.addWatchlist(movieId, status);
      showToast("A film sikeresen hozzáadva a bakancslistára.");
      await refreshAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const updateStatus = async (movieId: number, status: WatchStatus) => {
    try {
      await api.updateWatchlistStatus(movieId, status);
      showToast("A státusz frissítve.");
      await refreshAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeFromWatchlist = async (movieId: number, successMessage?: string) => {
    try {
      await api.removeWatchlist(movieId);
      showToast(successMessage ?? "A film eltávolítva a bakancslistáról.");
      await refreshAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveRating = async (event: FormEvent) => {
    event.preventDefault();
    if (!ratingDraft.movieId) {
      setRatingMovieInvalid(true);
      setError(VALIDATION.pickMovieForRating);
      return;
    }
    setRatingMovieInvalid(false);
    setError("");
    try {
      await api.upsertRating(ratingDraft.movieId, ratingDraft.score, ratingDraft.review);
      showToast("Az értékelés mentve.");
      await refreshAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const removeRating = async (movieId: number) => {
    try {
      await api.deleteRating(movieId);
      showToast("Az értékelés törölve.");
      await refreshAll();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main className="page">
      <header className="hero">
        <div className="hero-glow" aria-hidden />
        <p className="eyebrow">Movie Watchlist</p>
        <h1>A filmgyűjteményed, átláthatóan</h1>
        <p className="subtitle">Fedezz fel filmeket, kezeld a bakancslistádat, és rögzíts értékeléseket — egy helyen, mozis hangulattal.</p>
        <div className="hero-stats">
          <div className="stat-pill">
            <strong>{pagination.total}</strong>
            <span>film a katalógusban</span>
          </div>
          <div className="stat-pill">
            <strong>{watchlistTotal}</strong>
            <span>a bakancslistán</span>
          </div>
          <div className="stat-pill">
            <strong>{stats.count}</strong>
            <span>értékelés</span>
          </div>
        </div>
      </header>

      <div className="app-toolbar">
        <nav className="tabs" aria-label="Fő navigáció">
          <NavLink to="/" end className={navTabClass}>
            Filmek
          </NavLink>
          <NavLink to="/bakancslista" className={navTabClass}>
            Bakancslista
          </NavLink>
          <NavLink to="/ertekelesek" className={navTabClass}>
            Értékelések
          </NavLink>
        </nav>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          aria-label={theme === "dark" ? "Váltás világos módra" : "Váltás sötét módra"}
          title={theme === "dark" ? "Világos téma" : "Sötét téma"}
        >
          <span className="theme-toggle__icon" aria-hidden>
            {theme === "dark" ? "☀" : "☾"}
          </span>
        </button>
      </div>

      {error && <div className="alert error" role="alert">{error}</div>}
      {toast && <div className="toast" role="status">{toast}</div>}

      <Routes>
      <Route
        path="/"
        element={
        <div className="tab-panel" key="movies">
          <section id="movie-form-section" className="card movie-form-card">
            <h2>{editingId ? "Film szerkesztése" : "Új film hozzáadása"}</h2>
            <form className="grid-form" onSubmit={submitMovie}>
              <input
                required
                placeholder="Cím"
                value={form.title}
                onInvalid={(e) => {
                  e.currentTarget.setCustomValidity(VALIDATION.movieTitle);
                }}
                onChange={(e) => {
                  clearFieldValidity(e);
                  setForm({ ...form, title: e.target.value });
                }}
              />
              <input placeholder="Rendező" value={form.director} onChange={(e) => setForm({ ...form, director: e.target.value })} />
              <input type="number" placeholder="Év" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              <input placeholder="Műfaj" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
              <input className="full" placeholder="Poster URL" value={form.poster_url} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} />
              <textarea className="full" placeholder="Leírás" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="row full">
                <button type="submit">{editingId ? "Frissítés" : "Hozzáadás"}</button>
                {editingId && (
                  <button type="button" className="ghost" onClick={() => { setEditingId(null); setForm(emptyMovie); }}>
                    Mégsem
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="card">
            <h2>Keresés és szűrés</h2>
            <div className="filters">
              <input placeholder="Keresés cím/rendező/leírás alapján" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              <input placeholder="Műfaj" value={filters.genre} onChange={(e) => setFilters({ ...filters, genre: e.target.value })} />
              <input type="number" placeholder="Év" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} />
              <CustomSelect
                value={filters.status}
                onChange={(v) => setFilters({ ...filters, status: v })}
                options={FILTER_STATUS_OPTIONS}
              />
            </div>
          </section>

          {loading ? (
            <div className="loading-skel-grid" aria-busy="true" aria-label="Filmek betöltése">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skel-card skel-card--compact">
                  <div className="skel-body">
                    <div className="skel-line medium" />
                    <div className="skel-line short" />
                    <div className="skel-line" />
                    <div className="skel-line tiny" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!loading && movies.length === 0 ? (
            <div className="empty-state">
              <strong>Nincs találat</strong>
              <p>Próbálj másik keresést vagy szűrést, vagy adj hozzá új filmet a katalógushoz.</p>
            </div>
          ) : null}

          <section className="cards">
            {!loading
              ? movies.map((m, index) => (
                  <article
                    key={m.id}
                    className="movie-card movie-card--text"
                    style={{ "--enter-delay": `${Math.min(index, 8) * 45}ms` } as CSSProperties}
                  >
                    <div className="movie-content">
                      <h3>{m.title}</h3>
                      <p className="movie-meta-line">
                        {m.year ?? "—"} · {m.genre ?? "ismeretlen műfaj"}
                      </p>
                      <p className="small">{m.director ?? "ismeretlen rendező"}</p>
                      <p className="small">{m.description ?? "Nincs leírás."}</p>
                      <div className="chips">
                        {m.watchlist_status ? <span>{STATUS_LABELS[m.watchlist_status]}</span> : null}
                        {m.rating_score != null ? <span className="chip-rating">{m.rating_score}/10</span> : null}
                      </div>
                      <div className="actions">
                        <button type="button" onClick={() => startEdit(m)}>Szerkesztés</button>
                        <button type="button" className="danger" onClick={() => removeMovie(m.id)}>Törlés</button>
                        <button
                          type="button"
                          className={m.watchlist_status ? "icon-btn active" : "icon-btn"}
                          title="Bakancslista"
                          aria-label={m.watchlist_status ? "Eltávolítás a bakancslistáról" : "Bakancslistához adás"}
                          onClick={() => {
                            if (m.watchlist_status) {
                              void removeFromWatchlist(m.id, "Film sikeresen eltávolítva a bakancslistáról.");
                              return;
                            }
                            void addToWatchlist(m.id, "want_to_watch");
                          }}
                        >
                          {m.watchlist_status ? "♥" : "♡"}
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          title="Értékelés"
                          aria-label="Ugrás az értékeléshez"
                          onClick={() => {
                            setRatingDraft({ movieId: m.id, score: 8, review: "" });
                            navigate("/ertekelesek");
                          }}
                        >
                          ★
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              : null}
          </section>

          <div className="pagination">
            <button type="button" disabled={pagination.page <= 1} onClick={() => void loadMovies(pagination.page - 1)}>Előző</button>
            <span>{pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button type="button" disabled={pagination.page >= pagination.pages} onClick={() => void loadMovies(pagination.page + 1)}>Következő</button>
          </div>
        </div>
        }
      />
      <Route
        path="/bakancslista"
        element={
        <div className="tab-panel" key="watchlist">
        <section className="watch-grid">
          {(Object.keys(watchlist) as WatchStatus[]).map((status) => (
            <section key={status} className="card watch-column">
              <div className="watch-column-head">
                <h2>{STATUS_LABELS[status]}</h2>
                <span className="watch-count">{watchlist[status].length}</span>
              </div>
              {watchlist[status].length === 0 ? (
                <div className="empty-state watch-empty">
                  <p>
                    Még nincs itt film — adj hozzá a{" "}
                    <Link to="/" className="text-link">
                      Filmek
                    </Link>{" "}
                    oldalon.
                  </p>
                </div>
              ) : null}
              <ul className="watch-list">
                {watchlist[status].map((item) => (
                  <li key={item.watchlist_id}>
                    <article className="watch-item">
                      <div className="watch-item-main">
                        <PosterMedia title={item.title} url={item.poster_url} compact />
                        <div className="list-meta">
                          <strong>{item.title}</strong>
                          <p className="movie-meta-line watch-item-meta">
                            {item.year ?? "—"} · {item.genre ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="watch-actions">
                        <label className="visually-hidden" htmlFor={`watch-status-${item.watchlist_id}`}>
                          Státusz: {item.title}
                        </label>
                        <CustomSelect
                          id={`watch-status-${item.watchlist_id}`}
                          value={item.status}
                          onChange={(v) => void updateStatus(item.id, v as WatchStatus)}
                          options={WATCH_STATUS_OPTIONS}
                        />
                        <button type="button" className="danger watch-remove" onClick={() => void removeFromWatchlist(item.id)}>
                          Törlés
                        </button>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </section>
        </div>
        }
      />
      <Route
        path="/ertekelesek"
        element={
        <div className="tab-panel" key="ratings">
          <section className="card">
            <h2>Értékelés rögzítése</h2>
            <form className="grid-form" onSubmit={saveRating}>
              <CustomSelect
                id="rating-movie-select"
                value={ratingDraft.movieId ? String(ratingDraft.movieId) : ""}
                onChange={(v) => {
                  setRatingMovieInvalid(false);
                  setRatingDraft({ ...ratingDraft, movieId: v ? Number(v) : 0 });
                }}
                options={ratingMovieOptions}
                dimWhenEmpty
                invalid={ratingMovieInvalid}
              />
              <div className="slider-wrap full">
                <label htmlFor="score-slider">
                  Pontszám: <span className="score-preview">{ratingDraft.score}/10</span>
                </label>
                <input
                  id="score-slider"
                  className="score-slider"
                  type="range"
                  min={1}
                  max={10}
                  value={ratingDraft.score}
                  onChange={(e) => setRatingDraft({ ...ratingDraft, score: Number(e.target.value) })}
                />
              </div>
              <textarea className="full" placeholder="Vélemény" value={ratingDraft.review} onChange={(e) => setRatingDraft({ ...ratingDraft, review: e.target.value })} />
              <button type="submit" className="full">Mentés</button>
            </form>
          </section>

          <section className="card">
            <h2>Statisztika</h2>
            <div className="stats-grid">
              <div className="stat-box">
                <p>Értékelések</p>
                <strong>{stats.count}</strong>
              </div>
              <div className="stat-box">
                <p>Átlag pontszám</p>
                <strong>{stats.average != null ? stats.average.toFixed(1) : "—"}</strong>
              </div>
            </div>
            {stats.count > 0 ? (
              <>
                <p className="movie-meta-line" style={{ margin: "1rem 0 0" }}>Eloszlás (1–10)</p>
                <div className="distribution-bars">
                  {Array.from({ length: 10 }, (_, i) => {
                    const score = String(i + 1);
                    const count = stats.distribution[score] ?? 0;
                    const pct = (count / distMax) * 100;
                    return (
                      <div key={score} className="dist-col">
                        <div className="dist-bar" style={{ height: `${Math.max(pct, count ? 8 : 4)}%` }} title={`${score}: ${count}`} />
                        <span className="dist-label">{score}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </section>

          <section className="card">
            <h2>Értékelés lista</h2>
            {ratings.length === 0 ? (
              <div className="empty-state" style={{ marginTop: "0.5rem" }}>
                <p style={{ margin: 0 }}>Még nincs értékelés — válassz filmet a bakancslistáról és ments pontszámot.</p>
              </div>
            ) : null}
            {ratings.map((r) => (
              <article className="list-item" key={r.movie_id}>
                <div className="list-item-inner">
                  <div className="list-meta">
                    <strong>{r.title}</strong>
                    <StarRow score={r.score} />
                    <p className="small" style={{ marginTop: "0.35rem", WebkitLineClamp: 4 } as CSSProperties}>
                      {r.review || "Nincs szöveges vélemény."}
                    </p>
                  </div>
                </div>
                <button type="button" className="danger" onClick={() => void removeRating(r.movie_id)}>Törlés</button>
              </article>
            ))}
          </section>
        </div>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
