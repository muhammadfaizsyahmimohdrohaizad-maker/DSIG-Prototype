<?php
// api.php - Bulletproof MySQL Backend
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}
$host = "mysql-241871b6-student-92dd.k.aivencloud.com;port=18197"; // ⚠️ REPLACE 12345 WITH YOUR ACTUAL AIVEN PORT
$db_name = "defaultdb";
$username = "avnadmin";
$password = getenv('AIVEN_PASSWORD');;

try {
    $pdo = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password, [PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false]);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
    exit();
}
$host = "127.0.0.1;port=3307";
$db_name = "havlook_db";
$username = "root";
$password = "";

try {
    $pdo = new PDO("mysql:host=" . $host . ";dbname=" . $db_name . ";charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    echo json_encode([]); // Return empty array so React won't crash
    exit();
}

// -------------------------------------------------------------
// HELPER FUNCTIONS FOR ALERTS
// -------------------------------------------------------------
function sendSlackAlert($webhookUrl, $accountName, $score, $signals) {
    if (empty($webhookUrl)) return false;

    $payload = json_encode([
        "text" => "🚨 *High Churn Risk Alert Triggered!*",
        "attachments" => [
            [
                "color" => "#EF4444",
                "fields" => [
                    ["title" => "Company", "value" => $accountName, "short" => true],
                    ["title" => "Health Score", "value" => $score . " / 100", "short" => true],
                    ["title" => "Risk Signals", "value" => $signals, "short" => false]
                ],
                "footer" => "HavLook Risk Radar System",
                "ts" => time()
            ]
        ]
    ]);

    $ch = curl_init($webhookUrl);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $result = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ($httpCode >= 200 && $httpCode < 300);
}

function sendEmailAlert($toEmail, $accountName, $score, $signals) {
    if (empty($toEmail)) return false;

    $subject = "🚨 HavLook Alert: {$accountName} is at High Churn Risk ({$score}/100)";
    $message = "Attention CS Team,\n\n"
             . "The following account has passed the high-risk threshold:\n\n"
             . "Company: {$accountName}\n"
             . "Health Score: {$score} / 100\n"
             . "Risk Signals: {$signals}\n\n"
             . "-- HavLook Risk Radar";

    $headers = "From: alerts@havlook.io\r\n" .
               "Reply-To: alerts@havlook.io\r\n" .
               "X-Mailer: PHP/" . phpversion();

    return @mail($toEmail, $subject, $message, $headers);
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Handle Slack/Email Alert Webhooks
if ($action === 'alert' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    $slackSuccess = !empty($data['slackWebhook']) ? sendSlackAlert($data['slackWebhook'], $data['accountName'], $data['score'], $data['desc']) : false;
    $emailSuccess = !empty($data['recipientEmail']) ? sendEmailAlert($data['recipientEmail'], $data['accountName'], $data['score'], $data['desc']) : false;

    echo json_encode(['status' => 'success', 'slackSent' => $slackSuccess, 'emailSent' => $emailSuccess]);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

// 1. GET: Fetch accounts directly from MySQL database
if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM accounts ORDER BY id DESC");
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$accounts) {
            $accounts = [];
        }

        foreach ($accounts as &$acc) {
            $acc['id'] = (int)$acc['id'];
            $acc['score'] = (int)$acc['score'];

            // Safely parse history and factors to ensure they are NEVER null
            $decodedHistory = !empty($acc['history']) ? json_decode($acc['history'], true) : [];
            $acc['history'] = is_array($decodedHistory) ? $decodedHistory : [];

            $decodedFactors = !empty($acc['factors']) ? json_decode($acc['factors'], true) : [];
            $acc['factors'] = is_array($decodedFactors) ? $decodedFactors : [];
        }

        echo json_encode($accounts);
    } catch (PDOException $e) {
        echo json_encode([]); // Safety fallback to empty array
    }
    exit();
}

// 2. POST: Insert new account into MySQL (Updated with email)
if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!empty($data['name'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO accounts (`name`, `email`, `initials`, `desc`, `score`, `history`, `factors`) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $score = isset($data['score']) ? intval($data['score']) : 100; // Default to 100 if missing
            $email = isset($data['email']) ? $data['email'] : '';
            $history = json_encode([$score, $score, $score, $score, $score, $score]);
            $factors = json_encode([]);
            
            $stmt->execute([$data['name'], $email, $data['initials'], $data['desc'], $score, $history, $factors]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit();
    }
}

// 3. PUT: Update existing account in MySQL (Updated with email, removed score)
if ($method === 'PUT') {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!empty($data['id'])) {
        try {
            $stmt = $pdo->prepare("UPDATE accounts SET `name` = ?, `email` = ?, `initials` = ?, `desc` = ? WHERE `id` = ?");
            $email = isset($data['email']) ? $data['email'] : '';
            $stmt->execute([$data['name'], $email, $data['initials'], $data['desc'], intval($data['id'])]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit();
    }
}

// 4. DELETE: Remove account from MySQL
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : 0;
    if ($id > 0) {
        try {
            $stmt = $pdo->prepare("DELETE FROM accounts WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit();
    }
}
?>