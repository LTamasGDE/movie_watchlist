# Movie Watchlist App

## Projekt leírása
Egy teljes körű filmkezelő alkalmazás, amely lehetővé teszi a felhasználóknak:
- Filmek keresését és böngészését
- Saját bakancslista létrehozását (megnézendő, nézés alatt, megnézve)
- Filmek értékelését

## Tech Stack

**Backend:**
- PHP 8+ (REST API)
- SQLite adatbázis
- CORS engedélyezve az összes originnél

**Frontend:**
- React 19
- TypeScript
- Vite (fejlesztési szerver és build tool)

## Indítás

### Backend indítása

Egy PowerShell/CMD terminálban a projekt gyökérkönyvtárában:
```bash
php -S localhost:8000 router.php
```

A backend a `http://localhost:8000` címen fog futni.

### Frontend indítása

Egy másik terminálban:
```bash
cd frontend
npm run dev
```

A frontend fejlesztési szervere a `http://localhost:5173` címen fog futni (vagy más port, ha az foglalt).

---

## API Dokumentáció

Az API alap URL-je: http://localhost:8000/api

Minden válasz Content-Type: application/json és UTF-8 kódolású.
CORS engedélyezve van minden originnél (*) – fejlesztéshez megfelelő.

### Fontosabb endpoint hívás példa:

**Filmek keresése:**
```javascript
const res = await fetch('http://localhost:8000/api/movies?search=nolan');
const { data, pagination } = await res.json();
```

**Film hozzáadása a bakancslistához:**
```javascript
await fetch('http://localhost:8000/api/watchlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ movie_id: 3, status: 'want_to_watch' })
});
```

**Értékelés mentése:**
```javascript
await fetch('http://localhost:8000/api/ratings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ movie_id: 3, score: 8, review: 'Nagyon jó!' })
});
```

### REST API végpontok:

#### Filmek kezelése
- `GET /api/movies` - Filmek listája (keresés, szűrés, lapozás)
- `GET /api/movies/{id}` - Egy adott film részletei
- `POST /api/movies` - Új film hozzáadása
- `PUT /api/movies/{id}` - Film szerkesztése
- `DELETE /api/movies/{id}` - Film törlése

#### Bakancslista kezelése
- `GET /api/watchlist` - Bakancslista csoportosítva
- `POST /api/watchlist` - Film hozzáadása listához
- `PATCH /api/watchlist/{id}` - Státusz módosítása (pl. "status": watched)
- `DELETE /api/watchlist/{id}` - Eltávolítás a listáról

#### Értékelések kezelése
- `GET /api/ratings` - Összes értékelés + statisztika
- `POST /api/ratings` - Értékelés mentése (upsert)
- `DELETE /api/ratings/{id}` - Értékelés törlése 