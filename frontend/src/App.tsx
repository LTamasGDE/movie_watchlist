import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import type { Movie, Rating, WatchStatus, WatchlistItem } from "./types";

type Tab = "movies" | "watchlist" | "ratings";

const STATUS_LABELS: Record<WatchStatus, string> = {
  want_to_watch: "Megnézném",
  watching: "Nézem",
  watched: "Megnézve",
};

const emptyMovie = {
  title: "",
  director: "",
  year: "",
  genre: "",
  description: "",
  poster_url: "",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("movies");
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

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  };

  const refreshAll = async () => {
    await Promise.all([loadMovies(pagination.page), loadWatchlist(), loadRatings()]);
  };

  const loadMovies = async (page = 1) => {
    setLoading(true);
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
      setLoading(false);
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
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadMovies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.search, filters.genre, filters.year, filters.status]);

  const allWatchlistItems = useMemo(
    () => [...watchlist.watching, ...watchlist.want_to_watch, ...watchlist.watched],
    [watchlist],
  );

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <p className="eyebrow">Movie Watchlist</p>
        <h1>A filmgyűjteményed, átláthatóan</h1>
        <p className="subtitle">Fedezz fel filmeket, kezeld a bakancslistádat, és rögzíts értékeléseket.</p>
      </header>

      <nav className="tabs">
        {(["movies", "watchlist", "ratings"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "tab active" : "tab"} onClick={() => setTab(t)}>
            {t === "movies" ? "Filmek" : t === "watchlist" ? "Bakancslista" : "Értékelések"}
          </button>
        ))}
      </nav>

      {error && <div className="alert error">{error}</div>}
      {toast && <div className="toast">{toast}</div>}

      {tab === "movies" && (
        <>
          <section className="card">
            <h2>{editingId ? "Film szerkesztése" : "Új film hozzáadása"}</h2>
            <form className="grid-form" onSubmit={submitMovie}>
              <input required placeholder="Cím" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
              <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">Minden státusz</option>
                <option value="want_to_watch">Megnézném</option>
                <option value="watching">Nézem</option>
                <option value="watched">Megnézve</option>
              </select>
            </div>
          </section>

          {loading ? <p>Betöltés...</p> : null}
          <section className="cards">
            {movies.map((m) => (
              <article key={m.id} className="movie-card">
                <div className="movie-content">
                  <h3>{m.title}</h3>
                  <p>{m.year ?? "-"} · {m.genre ?? "ismeretlen műfaj"}</p>
                  <p className="small">{m.director ?? "ismeretlen rendező"}</p>
                  <p className="small">{m.description ?? "Nincs leírás."}</p>
                  <div className="chips">
                    {m.watchlist_status && <span>{STATUS_LABELS[m.watchlist_status]}</span>}
                    {m.rating_score ? <span>{m.rating_score}/10</span> : null}
                  </div>
                  <div className="actions">
                    <button onClick={() => startEdit(m)}>Szerkesztés</button>
                    <button className="danger" onClick={() => removeMovie(m.id)}>Törlés</button>
                    <button
                      className={m.watchlist_status ? "icon-btn active" : "icon-btn"}
                      title="Bakancslista"
                      aria-label="Bakancslistához adás"
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
                      className="icon-btn"
                      title="Értékelés"
                      aria-label="Értékelés"
                      onClick={() => { setRatingDraft({ movieId: m.id, score: 8, review: "" }); setTab("ratings"); }}
                    >
                      ★
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <div className="pagination">
            <button disabled={pagination.page <= 1} onClick={() => void loadMovies(pagination.page - 1)}>Előző</button>
            <span>{pagination.page} / {Math.max(1, pagination.pages)}</span>
            <button disabled={pagination.page >= pagination.pages} onClick={() => void loadMovies(pagination.page + 1)}>Következő</button>
          </div>
        </>
      )}

      {tab === "watchlist" && (
        <section className="watch-grid">
          {(Object.keys(watchlist) as WatchStatus[]).map((status) => (
            <section key={status} className="card">
              <h2>{STATUS_LABELS[status]}</h2>
              {watchlist[status].length === 0 ? <p>Nincs elem.</p> : null}
              {watchlist[status].map((item) => (
                <article className="list-item" key={item.id}>
                  <div className="list-meta">
                    <strong>{item.title}</strong>
                    <p>{item.year ?? "-"} · {item.genre ?? "-"}</p>
                  </div>
                  <div className="watch-actions">
                    <select value={item.status} onChange={(e) => void updateStatus(item.id, e.target.value as WatchStatus)}>
                      <option value="want_to_watch">Megnézném</option>
                      <option value="watching">Nézem</option>
                      <option value="watched">Megnézve</option>
                    </select>
                    <button className="danger" onClick={() => void removeFromWatchlist(item.id)}>Törlés</button>
                  </div>
                </article>
              ))}
            </section>
          ))}
        </section>
      )}

      {tab === "ratings" && (
        <>
          <section className="card">
            <h2>Értékelés rögzítése</h2>
            <form className="grid-form" onSubmit={saveRating}>
              <select
                required
                value={ratingDraft.movieId || ""}
                onChange={(e) => setRatingDraft({ ...ratingDraft, movieId: Number(e.target.value) })}
              >
                <option value="">Válassz filmet</option>
                {allWatchlistItems.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <input type="number" min={1} max={10} value={ratingDraft.score} onChange={(e) => setRatingDraft({ ...ratingDraft, score: Number(e.target.value) })} />
              <textarea className="full" placeholder="Vélemény" value={ratingDraft.review} onChange={(e) => setRatingDraft({ ...ratingDraft, review: e.target.value })} />
              <button type="submit" className="full">Mentés</button>
            </form>
          </section>

          <section className="card">
            <h2>Statisztika</h2>
            <p>Értékelések száma: {stats.count}</p>
            <p>Átlag: {stats.average ?? "-"}</p>
            <div className="distribution">
              {Object.entries(stats.distribution).map(([score, count]) => (
                <span key={score}>{score}: {count}</span>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Értékelés lista</h2>
            {ratings.map((r) => (
              <article className="list-item" key={r.movie_id}>
                <div>
                  <strong>{r.title}</strong>
                  <p>{r.score}/10</p>
                  <p>{r.review || "Nincs szöveges vélemény."}</p>
                </div>
                <button className="danger" onClick={() => void removeRating(r.movie_id)}>Törlés</button>
              </article>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
