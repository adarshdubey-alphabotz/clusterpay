// MongoDB initialization script
// Runs once on first container start via docker-entrypoint-initdb.d
// Creates a least-privilege application user scoped to clusterpay_db only.
//
// The root admin user (cpay_admin) is created from MONGO_INITDB_ROOT_* env vars.
// This script creates a separate app user (cpay_user) for the gateway service.

db = db.getSiblingDB('clusterpay_db');

db.createUser({
  user: 'cpay_user',
  pwd: process.env.MONGO_PASSWORD,
  roles: [
    { role: 'readWrite', db: 'clusterpay_db' }
    // No 'dbAdmin' or 'clusterAdmin' — least privilege principle
  ]
});

// Create required indexes immediately on init
db.payment_sessions.createIndex({ "session_id": 1 }, { unique: true });
db.payment_sessions.createIndex({ "merchant_id": 1 });
db.payment_sessions.createIndex({ "created_at": 1 });
db.payment_sessions.createIndex({ "status": 1 });
db.payment_sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 604800 }); // TTL: auto-delete after 7 days

// Unique compound index prevents cross-network TxID replay attacks
db.payment_tx_claims.createIndex({ "network": 1, "txid": 1 }, { unique: true });

db.merchants.createIndex({ "api_key": 1 }, { unique: true });
db.merchants.createIndex({ "merchant_id": 1 }, { unique: true });

print('[clusterpay] MongoDB initialized: cpay_user created, indexes applied.');
