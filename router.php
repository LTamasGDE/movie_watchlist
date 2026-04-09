<?php
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (str_starts_with($uri, '/api/')) {
    require __DIR__ . '/api/index.php';
} else {
    http_response_code(404);
    echo json_encode(['error' => 'Not found']);
}