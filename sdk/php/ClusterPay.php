<?php
/**
 * Official ClusterPay PHP SDK (v2.0)
 */
class ClusterPay {
    private string $apiKey;
    private string $baseUrl;

    public function __construct(string $apiKey, string $baseUrl = "https://pay.rapidx.me") {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    public function createCheckout(array $params): array {
        $url = $this->baseUrl . "/api/v1/checkout";
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($params));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . $this->apiKey,
            "Content-Type: application/json"
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true) ?: [];
    }

    public static function verifyWebhook(string $rawBody, string $signature, string $apiKey): bool {
        $expected = hash_hmac('sha256', $rawBody, $apiKey);
        return hash_equals($expected, $signature);
    }
}
