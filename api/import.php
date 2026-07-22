<?php
// api/import.php - One-click SQL Importer
$host = "mysql-241871b6-student-92dd.k.aivencloud.com";
$port = "18197";
$db_name = "defaultdb";
$username = "avnadmin";
$password = $_ENV['AIVEN_PASSWORD'] ?? getenv('AIVEN_PASSWORD') ?? '';

$sqlFile = __DIR__ . '/../havlook_db.sql';

if (!file_exists($sqlFile)) {
    die(" Error: Could not find 'havlook_db.sql' in your project root folder. Please place it inside C:\\xampp\\htdocs\\DSIG Prototype\\");
}

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$db_name};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false
    ]);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $sql = file_get_contents($sqlFile);
    $pdo->exec($sql);

    echo " Success! 'havlook_db.sql' was successfully imported into your Aiven MySQL database!";
} catch (Exception $e) {
    echo " Import Failed: " . $e->getMessage();
}
?>