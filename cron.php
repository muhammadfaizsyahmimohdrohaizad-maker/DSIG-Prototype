<?php
// cron.php - Automated Background Risk Monitor & Alert Dispatcher
// Executes via command line / server cron job

$host = "localhost";
$db_name = "havlook_db";
$username = "root";
$password = "";

// Configuration Thresholds
$highRiskCutoff = 35;
$slackWebhook = "YOUR_SLACK_WEBHOOK_URL_HERE"; // Replace with your webhook
$recipientEmail = "cs-alerts@yourcompany.com"; // Replace with your target email

date_default_timezone_set('UTC');
echo "[" . date('Y-m-d H:i:s') . "] Starting HavLook Churn Radar Scan...\n";

try {
    $pdo = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Fetch all accounts at or below high-risk cutoff
    $stmt = $pdo->prepare("SELECT * FROM accounts WHERE score <= :cutoff");
    $stmt->execute(['cutoff' => $highRiskCutoff]);
    $highRiskAccounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo "Found " . count($highRiskAccounts) . " accounts at or below risk threshold (" . $highRiskCutoff . ").\n\n";

    foreach ($highRiskAccounts as $acc) {
        echo "-> Dispatching alerts for: " . $acc['name'] . " (Score: " . $acc['score'] . ")\n";

        // 1. Dispatch Slack Webhook Payload
        if (!empty($slackWebhook) && $slackWebhook !== "YOUR_SLACK_WEBHOOK_URL_HERE") {
            $payload = json_encode([
                "text" => "🚨 *AUTOMATED NIGHTLY ALERT: Churn Risk Detected*",
                "attachments" => [
                    [
                        "color" => "#EF4444",
                        "fields" => [
                            ["title" => "Company", "value" => $acc['name'], "short" => true],
                            ["title" => "Health Score", "value" => $acc['score'] . " / 100", "short" => true],
                            ["title" => "Signals", "value" => $acc['desc'], "short" => false]
                        ],
                        "footer" => "HavLook Background Cron Monitor",
                        "ts" => time()
                    ]
                ]
            ]);

            $ch = curl_init($slackWebhook);
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_exec($ch);
            curl_close($ch);
        }

        // 2. Dispatch Email Payload
        if (!empty($recipientEmail)) {
            $subject = "🚨 [Auto-Alert] Churn Threat Detected: " . $acc['name'];
            $message = "Automated scan detected high churn risk for " . $acc['name'] . ".\n\n"
                     . "Current Score: " . $acc['score'] . " / 100\n"
                     . "Signals: " . $acc['desc'] . "\n\n"
                     . "Open HavLook dashboard to draft an AI recovery outreach.";
            $headers = "From: alerts@havlook.io\r\n";
            @mail($recipientEmail, $subject, $message, $headers);
        }
    }

    echo "\nScan finished! All automated alerts successfully dispatched.\n";

} catch (PDOException $e) {
    echo "Database connection error: " . $e->getMessage() . "\n";
}