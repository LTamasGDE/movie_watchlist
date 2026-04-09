<?php

$db = getDB();

if ($method === 'GET') {

    if ($id) {
        $stmt = $db->prepare("
            SELECT m.*,
                   w.status   AS watchlist_status,
                   r.score    AS rating_score,
                   r.review   AS rating_review
            FROM   movies m
            LEFT JOIN watchlist w ON w.movie_id = m.id
            LEFT JOIN ratings   r ON r.movie_id = m.id
            WHERE  m.id = ?
        ");
        $stmt->execute([$id]);
        $movie = $stmt->fetch();

        if (!$movie) {
            error('A film nem található.', 404);
        }

        respond($movie);
    }


    $search  = trim($_GET['search']  ?? '');
    $genre   = trim($_GET['genre']   ?? '');
    $status  = trim($_GET['status']  ?? '');   
    $year    = trim($_GET['year']    ?? '');
    $page    = max(1, (int)($_GET['page']  ?? 1));
    $perPage = min(50, max(1, (int)($_GET['per_page'] ?? 10)));
    $offset  = ($page - 1) * $perPage;

    $where  = ['1=1'];
    $params = [];

    if ($search !== '') {
        $where[]  = '(m.title LIKE ? OR m.director LIKE ? OR m.description LIKE ?)';
        $like     = "%$search%";
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    if ($genre !== '') {
        $where[]  = 'm.genre LIKE ?';
        $params[] = "%$genre%";
    }

    if ($year !== '') {
        $where[]  = 'm.year = ?';
        $params[] = (int)$year;
    }

    if ($status !== '') {
        $validStatuses = ['want_to_watch', 'watching', 'watched'];
        if (!in_array($status, $validStatuses, true)) {
            error('Érvénytelen státusz. Lehetséges értékek: want_to_watch, watching, watched');
        }
        $where[]  = 'w.status = ?';
        $params[] = $status;
    }

    $whereSQL = implode(' AND ', $where);

    $countStmt = $db->prepare("
        SELECT COUNT(*) FROM movies m
        LEFT JOIN watchlist w ON w.movie_id = m.id
        WHERE $whereSQL
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    $params[] = $perPage;
    $params[] = $offset;

    $stmt = $db->prepare("
        SELECT m.*,
               w.status AS watchlist_status,
               r.score  AS rating_score
        FROM   movies m
        LEFT JOIN watchlist w ON w.movie_id = m.id
        LEFT JOIN ratings   r ON r.movie_id = m.id
        WHERE  $whereSQL
        ORDER  BY m.created_at DESC
        LIMIT  ? OFFSET ?
    ");
    $stmt->execute($params);
    $movies = $stmt->fetchAll();

    respond([
        'data'       => $movies,
        'pagination' => [
            'total'    => $total,
            'page'     => $page,
            'per_page' => $perPage,
            'pages'    => (int)ceil($total / $perPage),
        ],
    ]);
}

if ($method === 'POST') {
    $body = bodyJSON();

    $title = trim($body['title'] ?? '');
    if ($title === '') {
        error('A film címe kötelező.');
    }

    $year = isset($body['year']) ? (int)$body['year'] : null;
    if ($year !== null && ($year < 1888 || $year > (int)date('Y') + 5)) {
        error('Érvénytelen évszám.');
    }

    $stmt = $db->prepare("
        INSERT INTO movies (title, director, year, genre, description, poster_url)
        VALUES (:title, :director, :year, :genre, :description, :poster_url)
    ");
    $stmt->execute([
        ':title'       => $title,
        ':director'    => trim($body['director']    ?? '') ?: null,
        ':year'        => $year,
        ':genre'       => trim($body['genre']       ?? '') ?: null,
        ':description' => trim($body['description'] ?? '') ?: null,
        ':poster_url'  => trim($body['poster_url']  ?? '') ?: null,
    ]);

    $newId = (int)$db->lastInsertId();
    $stmt  = $db->prepare('SELECT * FROM movies WHERE id = ?');
    $stmt->execute([$newId]);

    respond($stmt->fetch(), 201);
}

if ($method === 'PUT') {
    if (!$id) error('Hiányzó film azonosító.', 400);

    $check = $db->prepare('SELECT id FROM movies WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) error('A film nem található.', 404);

    $body  = bodyJSON();
    $title = trim($body['title'] ?? '');
    if ($title === '') error('A film címe kötelező.');

    $year = isset($body['year']) ? (int)$body['year'] : null;
    if ($year !== null && ($year < 1888 || $year > (int)date('Y') + 5)) {
        error('Érvénytelen évszám.');
    }

    $stmt = $db->prepare("
        UPDATE movies
        SET title = :title, director = :director, year = :year,
            genre = :genre, description = :description, poster_url = :poster_url
        WHERE id = :id
    ");
    $stmt->execute([
        ':title'       => $title,
        ':director'    => trim($body['director']    ?? '') ?: null,
        ':year'        => $year,
        ':genre'       => trim($body['genre']       ?? '') ?: null,
        ':description' => trim($body['description'] ?? '') ?: null,
        ':poster_url'  => trim($body['poster_url']  ?? '') ?: null,
        ':id'          => $id,
    ]);

    $stmt = $db->prepare('SELECT * FROM movies WHERE id = ?');
    $stmt->execute([$id]);
    respond($stmt->fetch());
}

if ($method === 'DELETE') {
    if (!$id) error('Hiányzó film azonosító.', 400);

    $check = $db->prepare('SELECT id FROM movies WHERE id = ?');
    $check->execute([$id]);
    if (!$check->fetch()) error('A film nem található.', 404);

    $db->prepare('DELETE FROM movies WHERE id = ?')->execute([$id]);
    respond(['message' => 'A film sikeresen törölve.']);
}

error('Nem támogatott HTTP metódus.', 405);