<?php

$db = getDB();

$validStatuses = ['want_to_watch', 'watching', 'watched'];

if ($method === 'GET') {

    $status = trim($_GET['status'] ?? '');

    $where  = [];
    $params = [];

    if ($status !== '') {
        if (!in_array($status, $validStatuses, true)) {
            error('Érvénytelen státusz. Lehetséges értékek: want_to_watch, watching, watched');
        }
        $where[]  = 'w.status = ?';
        $params[] = $status;
    }

    $whereSQL = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $db->prepare("
        SELECT w.id         AS watchlist_id,
               w.status,
               w.added_at,
               m.*,
               r.score      AS rating_score,
               r.review     AS rating_review
        FROM   watchlist w
        JOIN   movies m ON m.id = w.movie_id
        LEFT JOIN ratings r ON r.movie_id = m.id
        $whereSQL
        ORDER  BY
            CASE w.status
                WHEN 'watching'      THEN 1
                WHEN 'want_to_watch' THEN 2
                WHEN 'watched'       THEN 3
            END,
            w.added_at DESC
    ");
    $stmt->execute($params);
    $items = $stmt->fetchAll();

    $grouped = [
        'watching'      => [],
        'want_to_watch' => [],
        'watched'       => [],
    ];
    foreach ($items as $item) {
        $grouped[$item['status']][] = $item;
    }

    respond([
        'total'  => count($items),
        'items'  => $items,
        'groups' => $grouped,
    ]);
}

if ($method === 'POST') {
    $body    = bodyJSON();
    $movieId = (int)($body['movie_id'] ?? 0);
    $status  = trim($body['status'] ?? 'want_to_watch');

    if (!$movieId) error('Hiányzó movie_id mező.');
    if (!in_array($status, $validStatuses, true)) {
        error('Érvénytelen státusz. Lehetséges értékek: want_to_watch, watching, watched');
    }

    $check = $db->prepare('SELECT id FROM movies WHERE id = ?');
    $check->execute([$movieId]);
    if (!$check->fetch()) error('A film nem található.', 404);

    $exists = $db->prepare('SELECT id FROM watchlist WHERE movie_id = ?');
    $exists->execute([$movieId]);
    if ($exists->fetch()) {
        error('Ez a film már szerepel a bakancslistán.', 409);
    }

    $stmt = $db->prepare("
        INSERT INTO watchlist (movie_id, status) VALUES (?, ?)
    ");
    $stmt->execute([$movieId, $status]);

    $newId = (int)$db->lastInsertId();
    $stmt  = $db->prepare("
        SELECT w.*, m.title, m.director, m.year, m.genre
        FROM   watchlist w JOIN movies m ON m.id = w.movie_id
        WHERE  w.id = ?
    ");
    $stmt->execute([$newId]);

    respond($stmt->fetch(), 201);
}

if ($method === 'PATCH') {
    if (!$id) error('Hiányzó film azonosító.', 400);

    $body   = bodyJSON();
    $status = trim($body['status'] ?? '');

    if (!in_array($status, $validStatuses, true)) {
        error('Érvénytelen státusz. Lehetséges értékek: want_to_watch, watching, watched');
    }

    $check = $db->prepare('SELECT id FROM watchlist WHERE movie_id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) error('Ez a film nincs a bakancslistán.', 404);

    $db->prepare('UPDATE watchlist SET status = ? WHERE movie_id = ?')->execute([$status, $id]);

    $stmt = $db->prepare("
        SELECT w.*, m.title, m.director, m.year, m.genre
        FROM   watchlist w JOIN movies m ON m.id = w.movie_id
        WHERE  w.movie_id = ?
    ");
    $stmt->execute([$id]);
    respond($stmt->fetch());
}

if ($method === 'DELETE') {
    if (!$id) error('Hiányzó film azonosító.', 400);

    $check = $db->prepare('SELECT id FROM watchlist WHERE movie_id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) error('Ez a film nincs a bakancslistán.', 404);

    $db->prepare('DELETE FROM watchlist WHERE movie_id = ?')->execute([$id]);
    respond(['message' => 'A film sikeresen eltávolítva a bakancslistáról.']);
}

error('Nem támogatott HTTP metódus.', 405);