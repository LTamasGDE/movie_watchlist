<?php

define('DB_PATH', __DIR__ . '/../db/movies.db');

function getDB(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        try {
            $pdo = new PDO('sqlite:' . DB_PATH);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $pdo->exec('PRAGMA foreign_keys = ON;');
            initDB($pdo);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Adatbázis kapcsolódási hiba: ' . $e->getMessage()]);
            exit;
        }
    }

    return $pdo;
}

function initDB(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS movies (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT    NOT NULL,
            director    TEXT,
            year        INTEGER,
            genre       TEXT,
            description TEXT,
            poster_url  TEXT,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS watchlist (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id   INTEGER NOT NULL UNIQUE,
            status     TEXT    NOT NULL DEFAULT 'want_to_watch'
                            CHECK(status IN ('want_to_watch','watching','watched')),
            added_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS ratings (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id   INTEGER NOT NULL UNIQUE,
            score      INTEGER NOT NULL CHECK(score BETWEEN 1 AND 10),
            review     TEXT,
            rated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
        );
    ");

    $count = $pdo->query('SELECT COUNT(*) FROM movies')->fetchColumn();
    if ((int)$count === 0) {
        seedMovies($pdo);
    }
}

function seedMovies(PDO $pdo): void {
    $movies = [
        ['The Shawshank Redemption', 'Frank Darabont',     1994, 'Dráma',         'Két bebörtönzött férfi összebarátkozik évtizedek alatt, közös tisztességük és kegyelmük révén megváltást találva.', null],
        ['The Godfather',            'Francis Ford Coppola',1972, 'Krimi / Dráma', 'Az öreg Vito Corleone gengszterbirodalma és örökségének átadása.', null],
        ['Inception',                'Christopher Nolan',  2010, 'Sci-fi / Akció','Egy tolvaj, aki álmokba hatolva lop titkokat, egy utolsó feladatot kap: ültessen gondolatot valaki elméjébe.', null],
        ['Interstellar',             'Christopher Nolan',  2014, 'Sci-fi',         'Egy csapat asztronauta utazik a galaxis másik végébe, hogy megtalálja az emberiség új otthonát.', null],
        ['Pulp Fiction',             'Quentin Tarantino',  1994, 'Krimi / Dráma', 'Los Angeles-i bűnözők, kisebb és nagyobb, egymással összefüggő kalandjai.', null],
        ['The Dark Knight',          'Christopher Nolan',  2008, 'Akció / Krimi', 'Batman szembesül a Joker anarchiájával Gotham Cityben.', null],
        ['Forrest Gump',             'Robert Zemeckis',    1994, 'Dráma / Vígjáték','Egy alacsony IQ-jú, de jó szívű alabamai férfi életútja az 1950-es évektől napjainkig.', null],
        ['The Matrix',               'The Wachowskis',     1999, 'Sci-fi / Akció','Egy hacker rájön, hogy a valóság, amelyben él, egy gépi civilizáció által szimulált világ.', null],
        ['Schindler\'s List',         'Steven Spielberg',   1993, 'Történelmi / Dráma','Oskar Schindler náci üzletember megment több mint ezer zsidót a holokauszttól.', null],
        ['Fight Club',               'David Fincher',      1999, 'Dráma / Thriller','Egy szappangyártó és egy karizmatikus szélhámos titokban alapít egy harcklub hálózatot.', null],
    ];

    $stmt = $pdo->prepare("
        INSERT INTO movies (title, director, year, genre, description, poster_url)
        VALUES (?, ?, ?, ?, ?, ?)
    ");

    foreach ($movies as $m) {
        $stmt->execute($m);
    }
}