import logging
from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings

logger = logging.getLogger(__name__)

client: AsyncIOMotorClient = None
db = None

async def init_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]
    
    # Create indexes for high performance & anti-theft uniqueness
    try:
        # Prevent double-spending / replay attacks
        await db.payment_tx_claims.create_index("txid", unique=True)
        # Fast query for sessions
        await db.payment_sessions.create_index("session_id", unique=True)
        await db.payment_sessions.create_index("merchant_id")
        await db.payment_sessions.create_index("created_at")
        # Merchants & API keys
        await db.merchants.create_index("api_key", unique=True)
        logger.info("MongoDB initialized with unique compound indexes.")
    except Exception as e:
        logger.error(f"Error creating MongoDB indexes: {e}")

def get_db():
    return db
