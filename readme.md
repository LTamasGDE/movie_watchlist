Az API alap URL-je: http://localhost:8000/api

Minden válasz Content-Type: application/json és UTF-8 kódolású.
CORS engedélyezve van minden originnél (*) – fejlesztéshez megfelelő.

Fontosabb endpoint hívás példa:
Filmek keresése
const res = await fetch('http://localhost:8000/api/movies?search=nolan');
const { data, pagination } = await res.json();

// Film hozzáadása a bakancslistához
await fetch('http://localhost:8000/api/watchlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ movie_id: 3, status: 'want_to_watch' })
});

// Értékelés mentése
await fetch('http://localhost:8000/api/ratings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ movie_id: 3, score: 8, review: 'Nagyon jó!' })
});

REST API végpontok:
/api/movies - GET - Filmek listája (keresés, szűrés, lapozás)

/api/movies/{id} - GET - Egy adott film részletei

/api/movies - POST - Új film hozzáadása

/api/movies/{id} - PUT - Film szerkesztése

/api/movies/{id} - DELETE - Film törlése

/api/watchlist - GET - Bakancslista csoportosítva

/api/watchlist - POST - Film hozzáadása listához

/api/watchlist/{id} - PATCH - Státusz módosítása (pl. "status": watched)

/api/watchlist/{id} - DELETE - Eltávolítás a listáról

/api/ratings/ - GET - Összes értékelés + statisztika

/api/ratings - POST - Értékelés mentése (upsert)

/api/ratings/{id} - DELETE - Értékelés törlése

Ezzel tudod elindítani a backendet: php -S localhost:8000 router.php
És ilyen formátumban kell megnyitni a végpontokat: http://localhost:8000/api/movies

Ha megvan a frontend akkor egyben leteszteljük a működést. 