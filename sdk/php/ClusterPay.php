<?php
/**
 * ⚡ Official ClusterPay PHP SDK (v2.1.0)
 * Enterprise-grade client for WooCommerce, Laravel, and custom PHP platforms.
 */

namespace ClusterPay;

class ClusterPayException extends \Exception {}
class AuthenticationException extends ClusterPayException {}
class ValidationException extends ClusterPayException {}
class NotFoundException extends ClusterPayException {}

class Client {
    private string $apiKey;
    private string $baseUrl;
    private int $timeout;

    public function __construct(string $apiKey, string $baseUrl = "http://localhost:8085", int $timeout = 15) {
        if (empty($apiKey) || strpos($apiKey, 'CS_key_') !== 0) {
            throw new AuthenticationException("A valid API Key starting with 'CS_key_' is required.");
        }
        $this->apiKey = trim($apiKey);
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
    }

    private function request(string $method, string $endpoint, array $data = []): array {
        $url = $this->baseUrl . $endpoint;
        $ch = curl_init($url);

        $headers = [
            "Authorization: Bearer " . $this->apiKey,
            "Content-Type: application/json",
            "User-Agent: ClusterPay-PHP-SDK/2.1.0"
        ];

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $this->timeout);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            throw new ClusterPayException("Network / cURL error: " . $curlError);
        }

        $decoded = json_decode($response, true) ?: [];

        if ($httpCode === 401 || $httpCode === 403) {
            throw new AuthenticationException($decoded['detail'] ?? "Unauthorized API key or IP restriction.");
        } elseif ($httpCode === 404) {
            throw new NotFoundException($decoded['detail'] ?? "Resource not found.");
        } elseif ($httpCode >= 400) {
            throw new ValidationException($decoded['detail'] ?? "HTTP " . $httpCode . " error.");
        }

        return $decoded;
    }

    public function createCheckout(array $params): array {
        if (!isset($params['amount']) || $params['amount'] <= 0) {
            throw new ValidationException("Payment amount must be greater than 0.");
        }
        if (empty($params['callback_url'])) {
            throw new ValidationException("callback_url is required for webhook notifications.");
        }
        return $this->request('POST', '/api/v1/checkout', $params);
    }

    public function getStatus(string $sessionId): array {
        return $this->request('GET', '/api/v1/status/' . urlencode($sessionId));
    }

    public function resendWebhook(string $sessionId): array {
        return $this->request('POST', '/api/v1/webhook/resend/' . urlencode($sessionId));
    }

    /**
     * Timing-safe cryptographic webhook verification with timestamp drift defense.
     */
    public static function verifyWebhook(
        string $rawBody,
        string $signature,
        string $timestamp,
        string $nonce,
        string $apiKey,
        int $maxDrift = 300
    ): bool {
        if (empty($signature) || empty($apiKey)) {
            return false;
        }
        if (!empty($timestamp) && abs(time() - intval($timestamp)) > $maxDrift) {
            return false;
        }
        $payload = (!empty($timestamp) && !empty($nonce)) ? ($timestamp . "." . $nonce . "." . $rawBody) : $rawBody;
        $expected = hash_hmac('sha256', $payload, $apiKey);
        return hash_equals($expected, $signature);
    }
}
