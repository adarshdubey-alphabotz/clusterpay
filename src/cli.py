import asyncio
import secrets
import argparse
import sys
from datetime import datetime
from src.database import init_db, get_db

async def create_merchant(name: str, allowed_ips: list[str] = None):
    await init_db()
    db = get_db()
    
    merchant_id = secrets.randbelow(899999) + 100000
    secret_hash = secrets.token_hex(16)
    api_key = f"CS_key_{merchant_id}_{secret_hash}"
    
    doc = {
        "merchant_id": merchant_id,
        "name": name,
        "api_key": api_key,
        "api_enabled": True,
        "allowed_ips": allowed_ips or [],
        "created_at": datetime.utcnow()
    }
    
    await db.merchants.insert_one(doc)
    print("\n✅ Merchant Created Successfully!")
    print("=" * 50)
    print(f"Merchant ID: {merchant_id}")
    print(f"Name:        {name}")
    print(f"API Key:     {api_key}")
    print(f"Allowed IPs: {allowed_ips or 'All (No IP restriction)'}")
    print("=" * 50)
    print("Keep your API Key secret. Use it in the 'Authorization: Bearer <API_KEY>' header.\n")

async def list_merchants():
    await init_db()
    db = get_db()
    cursor = db.merchants.find({}, {"_id": 0})
    merchants = [m async for m in cursor]
    print(f"\n📋 Registered Merchants ({len(merchants)}):")
    print("=" * 70)
    for m in merchants:
        status = "Active" if m.get("api_enabled", True) else "Disabled"
        print(f"ID: {m.get('merchant_id')} | Name: {m.get('name'):20s} | Status: {status:8s} | Key: {m.get('api_key')[:18]}...")
    print("=" * 70 + "\n")

async def revoke_merchant(api_key: str):
    await init_db()
    db = get_db()
    res = await db.merchants.update_one({"api_key": api_key}, {"$set": {"api_enabled": False}})
    if res.modified_count > 0:
        print(f"✅ Merchant with API key {api_key[:18]}... has been disabled.")
    else:
        print("❌ Merchant not found.")

def main():
    parser = argparse.ArgumentParser(description="ClusterPay Merchant Management CLI")
    subparsers = parser.add_subparsers(dest="command")
    
    create_p = subparsers.add_parser("create-merchant", help="Generate a new merchant account & API key")
    create_p.add_argument("--name", required=True, help="Merchant display name")
    create_p.add_argument("--ips", help="Comma-separated IP whitelist (e.g. 1.2.3.4,5.6.7.8)")
    
    subparsers.add_parser("list-merchants", help="List all registered merchants")
    
    revoke_p = subparsers.add_parser("revoke-merchant", help="Disable a merchant API key")
    revoke_p.add_argument("--key", required=True, help="Full CS_key_... to disable")
    
    args = parser.parse_args()
    if args.command == "create-merchant":
        ips = [ip.strip() for ip in args.ips.split(",")] if args.ips else []
        asyncio.run(create_merchant(args.name, ips))
    elif args.command == "list-merchants":
        asyncio.run(list_merchants())
    elif args.command == "revoke-merchant":
        asyncio.run(revoke_merchant(args.key))
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
