<?php
// api/index.php - Self-Healing Bulletproof Aiven MySQL Backend for Vercel
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Aiven Cloud MySQL Credentials
$host = "mysql-241871b6-student-92dd.k.aivencloud.com";
$port = "18197";
$db_name = "defaultdb";
$username = "avnadmin";

// Read password safely across all Vercel environments
$password = $_ENV['AIVEN_PASSWORD'] ?? getenv('AIVEN_PASSWORD') ?? $_SERVER['AIVEN_PASSWORD'] ?? '';

if (empty($password)) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database password variable (AIVEN_PASSWORD) is not set in Vercel settings."]);
    exit();
}

try {
    $dsn = "mysql:host={$host};port={$port};dbname={$db_name};charset=utf8mb4";
    $pdo = new PDO($dsn, $username, $password, [
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false
    ]);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // -------------------------------------------------------------
    // AUTO-SETUP: CREATE TABLE & SEED DUMMY DATA IF EMPTY
    // -------------------------------------------------------------
    $pdo->exec("CREATE TABLE IF NOT EXISTS accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        initials VARCHAR(10),
        `desc` TEXT,
        score INT DEFAULT 100,
        history JSON,
        factors JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $checkCount = (int)$pdo->query("SELECT COUNT(*) FROM accounts")->fetchColumn();
    if ($checkCount === 0) {
        $pdo->exec("INSERT INTO accounts (`name`, `email`, `initials`, `desc`, `score`, `history`, `factors`) VALUES 
        ('Echo Analytics', 'devs@echoanalytics.io', 'EA', 'New integration activated; seat count doubled', 96, '[78, 80, 81, 82, 85, 96]', '[{\"name\":\"Seat Expansion\",\"val\":\"+100%\",\"percent\":100,\"isPositive\":true}]'),
        ('Solaris Energy', 'billing@solaris.com', 'SE', 'Contract renewal coming up in 14 days; no response', 38, '[60, 55, 50, 45, 40, 38]', '[{\"name\":\"Radio Silence\",\"val\":\"14 days\",\"percent\":80,\"isPositive\":false}]'),
        ('Zenith FinTech', 'support@zenith.com', 'ZF', 'Unresolved critical bug ticket open for 14 days', 29, '[70, 60, 50, 40, 35, 29]', '[{\"name\":\"Open Bug Tickets\",\"val\":\"Critical\",\"percent\":90,\"isPositive\":false}]'),
        ('Quantum Logistics', 'tech@quantum.com', 'QL', 'Account healthy with high daily active user count', 92, '[85, 86, 88, 90, 91, 92]', '[{\"name\":\"High DAU\",\"val\":\"+25%\",\"percent\":95,\"isPositive\":true}]'),
        ('Aether Dynamics', 'admin@aether.com', 'AD', 'Feature utilization under 15% of plan capacity', 31, '[55, 50, 45, 40, 35, 31]', '[{\"name\":\"Low Utilization\",\"val\":\"<15%\",\"percent\":85,\"isPositive\":false}]'),
        ('Starlight Global', 'ops@starlight.com', 'SG', 'Primary champion left company; new admin onboarded', 48, '[80, 75, 60, 55, 50, 48]', '[{\"name\":\"Champion Left\",\"val\":\"High Risk\",\"percent\":70,\"isPositive\":false}]')");
    }

} catch(PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Database Connection Failed: " . $e->getMessage()]);
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
$data = json_decode(file_get_contents("php://input"), true);

// 1. GET: Fetch accounts directly from Aiven MySQL database
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

            // Safely parse history and factors to ensure valid arrays for React
            $decodedHistory = !empty($acc['history']) ? json_decode($acc['history'], true) : [];
            $acc['history'] = is_array($decodedHistory) ? $decodedHistory : [];

            $decodedFactors = !empty($acc['factors']) ? json_decode($acc['factors'], true) : [];
            $acc['factors'] = is_array($decodedFactors) ? $decodedFactors : [];
        }

        echo json_encode($accounts);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    }
    exit();
}

// 2. POST: Insert new account into MySQL
if ($method === 'POST') {
    if (!empty($data['name'])) {
        try {
            $stmt = $pdo->prepare("INSERT INTO accounts (`name`, `email`, `initials`, `desc`, `score`, `history`, `factors`) VALUES (?, ?, ?, ?, ?, ?, ?)");
            $score = isset($data['score']) ? intval($data['score']) : 100;
            $email = isset($data['email']) ? $data['email'] : '';
            $history = json_encode([$score, $score, $score, $score, $score, $score]);
            $factors = json_encode([]);
            
            $stmt->execute([$data['name'], $email, $data['initials'], $data['desc'], $score, $history, $factors]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit();
    }
}

// 3. PUT: Update existing account in MySQL
if ($method === 'PUT') {
    if (!empty($data['id'])) {
        try {
            $stmt = $pdo->prepare("UPDATE accounts SET `name` = ?, `email` = ?, `initials` = ?, `desc` = ? WHERE `id` = ?");
            $email = isset($data['email']) ? $data['email'] : '';
            $stmt->execute([$data['name'], $email, $data['initials'], $data['desc'], intval($data['id'])]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit();
    }
}

// 4. DELETE: Remove account from MySQL (Checks URL query param AND JSON body)
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['id']) ? intval($data['id']) : 0);
    
    if ($id > 0) {
        try {
            $stmt = $pdo->prepare("DELETE FROM accounts WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        }
        exit();
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Missing account ID for deletion']);
        exit();
    }
}
?>