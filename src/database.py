import logging
from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None

SEVEN_DAYS_SECONDS = 604_800   # TTL for expired session cleanup

async def init_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    try:
        # ── Anti-replay: unique compound lock prevents same TxID claiming two invoices ──
        await db.payment_tx_claims.create_index(
            [("network", 1), ("txid", 1)], unique=True
        )

        # ── Payment sessions ───────────────────────────────────────────────────────────
        await db.payment_sessions.create_index("session_id", unique=True)
        await db.payment_sessions.create_index("merchant_id")
        await db.payment_sessions.create_index("created_at")
        await db.payment_sessions.create_index("status")
        # TTL index: MongoDB auto-deletes expired sessions after 7 days (keeps storage bounded)
        await db.payment_sessions.create_index(
            "expires_at", expireAfterSeconds=SEVEN_DAYS_SECONDS
        )

        # ── Merchants & API keys ───────────────────────────────────────────────────────
        await db.merchants.create_index("api_key", unique=True)
        await db.merchants.create_index("merchant_id", unique=True)

        logger.info("MongoDB initialized: indexes and TTL policy applied.")
    except Exception as e:
        logger.error(f"Error creating MongoDB indexes: {e}")


def get_db():
    return db
