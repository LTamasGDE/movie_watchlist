<?php

$db = getDB();

if ($method === 'GET') {

    if ($id) {
        $stmt = $db->prepare("
            SELECT r.*, m.title, m.director, m.year, m.genre
            FROM   ratings r JOIN movies m ON m.id = r.movie_id
            WHERE  r.movie_id = ?
        ");
        $stmt->execute([$id]);
        $rating = $stmt->fetch();
        if (!$rating) error('Ehhez a filmhez még nincs értékelés.', 404);
        respond($rating);
    }

    $stmt = $db->prepare("
        SELECT r.*,
               m.title,
               m.director,
               m.year,
               m.genre
        FROM   ratings r JOIN movies m ON m.id = r.movie_id
        ORDER  BY r.score DESC, r.rated_at DESC
    ");
    $stmt->execute();
    $ratings = $stmt->fetchAll();

    $scores = array_column($ratings, 'score');
    $avg    = count($scores) > 0
        ? round(array_sum($scores) / count($scores), 1)
        : null;

    $distribution = array_fill(1, 10, 0);
    foreach ($scores as $s) {
        $distribution[(int)$s]++;
    }

    respond([
        'data'  => $ratings,
        'stats' => [
            'count'        => count($ratings),
            'average'      => $avg,
            'distribution' => $distribution,
        ],
    ]);
}

if ($method === 'POST') {
    $body    = bodyJSON();
    $movieId = (int)($body['movie_id'] ?? 0);
    $score   = isset($body['score']) ? (int)$body['score'] : null;
    $review  = trim($body['review'] ?? '') ?: null;

    if (!$movieId) error('Hiányzó movie_id mező.');
    if ($score === null || $score < 1 || $score > 10) {
        error('Az értékelés (score) 1 és 10 közötti egész szám kell legyen.');
    }

    $check = $db->prepare('SELECT id FROM movies WHERE id = ?');
    $check->execute([$movieId]);
    if (!$check->fetch()) error('A film nem található.', 404);

    $existing = $db->prepare('SELECT id FROM ratings WHERE movie_id = ?');
    $existing->execute([$movieId]);
    $isUpdate = (bool)$existing->fetch();

    if ($isUpdate) {
        $db->prepare("
            UPDATE ratings SET score = ?, review = ?, rated_at = CURRENT_TIMESTAMP
            WHERE  movie_id = ?
        ")->execute([$score, $review, $movieId]);
    } else {
        $db->prepare("
            INSERT INTO ratings (movie_id, score, review) VALUES (?, ?, ?)
        ")->execute([$movieId, $score, $review]);
    }

    $stmt = $db->prepare("
        SELECT r.*, m.title, m.director, m.year, m.genre
        FROM   ratings r JOIN movies m ON m.id = r.movie_id
        WHERE  r.movie_id = ?
    ");
    $stmt->execute([$movieId]);

    respond($stmt->fetch(), $isUpdate ? 200 : 201);
}

if ($method === 'DELETE') {
    if (!$id) error('Hiányzó film azonosító.', 400);

    $check = $db->prepare('SELECT id FROM ratings WHERE movie_id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) error('Ehhez a filmhez nincs értékelés.', 404);

    $db->prepare('DELETE FROM ratings WHERE movie_id = ?')->execute([$id]);
    respond(['message' => 'Az értékelés sikeresen törölve.']);
}

error('Nem támogatott HTTP metódus.', 405);