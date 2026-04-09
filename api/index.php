<?php

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}


function respond(mixed $data, int $status = 200): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

function error(string $message, int $status = 400): never {
    respond(['error' => $message], $status);
}

function bodyJSON(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE && !empty($raw)) {
        error('Érvénytelen JSON a kérés törzsében.');
    }
    return $data ?? [];
}

function pathSegments(): array {
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    $path = preg_replace('#^/api#', '', $path);   // /api prefix eltávolítása
    return array_values(array_filter(explode('/', trim($path, '/'))));
}


$method   = $_SERVER['REQUEST_METHOD'];
$segments = pathSegments();
$resource = $segments[0] ?? null;
$id       = isset($segments[1]) ? (int)$segments[1] : null;
$sub      = $segments[2] ?? null;   // pl. /movies/5/watchlist

match ($resource) {
    'movies'    => require __DIR__ . '/movies.php',
    'watchlist' => require __DIR__ . '/watchlist.php',
    'ratings'   => require __DIR__ . '/ratings.php',
    default     => error('Ismeretlen végpont.', 404),
};