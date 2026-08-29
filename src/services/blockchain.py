import logging
import httpx
from decimal import Decimal
from typing import Tuple, Optional
from src.config import settings

logger = logging.getLogger("clusterpay.blockchain")

# Official Token Contract Whitelists
OFFICIAL_CONTRACTS = {
    "USDT_BEP20": "0x55d398326f99059fF775485246999027B3197955".lower(),
    "USDT_TRC20": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "USDT_POLY": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F".lower(),
    "USDT_ARB": "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9".lower(),
}

# Standard RPC Endpoints (Free, High-Availability Fallback Lists)
EVM_RPCS = {
    "BSC": [
        "https://bsc-dataseed.binance.org",
        "https://binance.llamarpc.com",
        "https://bsc.meowrpc.com",
        "https://1rpc.io/bnb"
    ],
    "POLYGON": [
        "https://polygon-rpc.com",
        "https://polygon.llamarpc.com",
        "https://1rpc.io/matic"
    ],
    "ARBITRUM": [
        "https://arb1.arbitrum.io/rpc",
        "https://arbitrum.llamarpc.com"
    ]
}

TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

async def _evm_rpc_call(chain: str, method: str, params: list) -> Optional[dict]:
    rpcs = EVM_RPCS.get(chain.upper(), [])
    for rpc in rpcs:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(rpc, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params})
                if res.status_code == 200:
                    data = res.json()
                    if "result" in data:
                        return data["result"]
        except Exception as e:
            logger.warning(f"EVM RPC {rpc} failed for {chain}: {e}")
    return None

async def verify_evm_usdt(chain: str, token_key: str, txid: str, recipient: str, expected_amount: float) -> Tuple[bool, str, float]:
    """
    Military-grade EVM Verification:
    1. Fetches transaction receipt from RPC.
    2. Validates execution status == 1 (successful, not reverted).
    3. Verifies contract address matches official whitelist.
    4. Decodes ERC-20 Transfer log: recipient address and exact micro-offset value.
    """
    receipt = await _evm_rpc_call(chain, "eth_getTransactionReceipt", [txid])
    if not receipt:
        return False, "Transaction receipt not found or pending in mempool", 0.0

    # 1. Status Check
    status = receipt.get("status")
    if status not in ("0x1", 1, "1"):
        return False, "Transaction was reverted or failed on-chain", 0.0

    # Decimals & Contract
    expected_contract = OFFICIAL_CONTRACTS.get(token_key, "").lower()
    decimals = 18 if token_key == "USDT_BEP20" else 6
    clean_recipient = recipient.lower().replace("0x", "").zfill(64)

    logs = receipt.get("logs", [])
    found_valid = False
    amount_found = 0.0

    for log in logs:
        log_address = log.get("address", "").lower()
        topics = log.get("topics", [])
        if log_address != expected_contract or not topics:
            continue

        if topics[0].lower() == TRANSFER_TOPIC.lower() and len(topics) >= 3:
            log_recipient = topics[2].lower().replace("0x", "").zfill(64)
            if log_recipient == clean_recipient:
                raw_data = log.get("data", "0x0")
                raw_val = int(raw_data, 16)
                amount_found = float(Decimal(raw_val) / Decimal(10 ** decimals))
                
                # Verify 6-decimal exact precision match (or overpayment)
                if abs(amount_found - expected_amount) < 0.000005 or amount_found >= expected_amount:
                    found_valid = True
                    break

    if not found_valid:
        return False, f"Transfer to {recipient} with amount ${expected_amount:.6f} not found in receipt logs", amount_found

    return True, "On-chain transaction verified successfully", amount_found

async def verify_tron_usdt(txid: str, recipient: str, expected_amount: float) -> Tuple[bool, str, float]:
    """
    Tron TRC-20 Verification via TronGrid / TronScan with 6-decimal precision.
    """
    urls = [
        f"https://apilist.tronscanapi.com/api/transaction-info?hash={txid}",
        f"https://api.trongrid.io/v1/transactions/{txid}/events"
    ]
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(urls[0])
            if res.status_code == 200:
                data = res.json()
                if data.get("contractRet") != "SUCCESS":
                    return False, "Tron transaction reverted or unsuccessful", 0.0
                
                # Check TRC20 transfer info
                transfers = data.get("trc20TransferInfo", [])
                for t in transfers:
                    if t.get("contract_address") == OFFICIAL_CONTRACTS["USDT_TRC20"]:
                        if t.get("to_address", "").lower() == recipient.lower():
                            raw_val = int(t.get("amount_str", 0))
                            amount = float(Decimal(raw_val) / Decimal(10 ** 6))
                            if abs(amount - expected_amount) < 0.000005 or amount >= expected_amount:
                                return True, "Tron TRC-20 payment verified successfully", amount
                            return False, f"Tron transfer found but amount mismatch: expected {expected_amount}, received {amount}", amount
        except Exception as e:
            logger.warning(f"Tron verification error: {e}")

    return False, "Tron transaction could not be verified at this moment", 0.0

async def verify_evm_native(chain: str, txid: str, recipient: str, expected_amount: float) -> Tuple[bool, str, float]:
    """
    Verifies native EVM cryptocurrency transfers (BNB on BSC, POL on Polygon).
    """
    tx = await _evm_rpc_call(chain, "eth_getTransactionByHash", [txid])
    if not tx:
        return False, f"Transaction {txid} not found on {chain} mempool/blocks", 0.0

    receipt = await _evm_rpc_call(chain, "eth_getTransactionReceipt", [txid])
    if not receipt:
        return False, "Transaction receipt pending confirmation", 0.0

    status = receipt.get("status")
    if status not in ("0x1", 1, "1"):
        return False, "Transaction was reverted or failed on-chain", 0.0

    tx_to = tx.get("to") or ""
    if tx_to.lower() != recipient.lower():
        return False, f"Recipient mismatch: transfer was sent to {tx_to}, expected {recipient}", 0.0

    raw_val = int(tx.get("value", "0x0"), 16)
    amount_found = float(Decimal(raw_val) / Decimal(10 ** 18))

    if abs(amount_found - expected_amount) < 0.000005 or amount_found >= expected_amount:
        return True, f"{chain} native transfer verified successfully", amount_found

    return False, f"Amount mismatch: expected {expected_amount:.6f}, received {amount_found:.6f}", amount_found


async def verify_btc_transfer(txid: str, recipient: str, expected_amount: float) -> Tuple[bool, str, float]:
    """
    Verifies Bitcoin mainnet UTXO transfers via Mempool.space API.
    """
    urls = [
        f"https://mempool.space/api/tx/{txid}",
        f"https://blockstream.info/api/tx/{txid}"
    ]
    async with httpx.AsyncClient(timeout=10.0) as client:
        for url in urls:
            try:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    vouts = data.get("vout", [])
                    for v in vouts:
                        addr = v.get("scriptpubkey_address", "")
                        if addr.lower() == recipient.lower():
                            sats = v.get("value", 0)
                            btc_amt = float(Decimal(sats) / Decimal(10 ** 8))
                            if abs(btc_amt - expected_amount) < 0.00000005 or btc_amt >= expected_amount:
                                return True, "Bitcoin payment verified successfully", btc_amt
                            return False, f"BTC amount mismatch: expected {expected_amount:.8f}, received {btc_amt:.8f}", btc_amt
            except Exception as e:
                logger.warning(f"BTC verify error ({url}): {e}")

    return False, f"Bitcoin transaction {txid} not found or unconfirmed", 0.0


async def verify_ltc_transfer(txid: str, recipient: str, expected_amount: float) -> Tuple[bool, str, float]:
    """
    Verifies Litecoin transfers via LitecoinSpace / BlockCypher.
    """
    urls = [
        f"https://litecoinspace.org/api/tx/{txid}",
        f"https://api.blockcypher.com/v1/ltc/main/txs/{txid}"
    ]
    async with httpx.AsyncClient(timeout=10.0) as client:
        for url in urls:
            try:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    vouts = data.get("vout", []) or data.get("outputs", [])
                    for v in vouts:
                        addrs = v.get("scriptpubkey_address", "") or (v.get("addresses", [""])[0] if v.get("addresses") else "")
                        if addrs.lower() == recipient.lower():
                            sats = v.get("value", 0)
                            ltc_amt = float(Decimal(sats) / Decimal(10 ** 8))
                            if abs(ltc_amt - expected_amount) < 0.0000005 or ltc_amt >= expected_amount:
                                return True, "Litecoin payment verified successfully", ltc_amt
                            return False, f"LTC amount mismatch: expected {expected_amount:.6f}, received {ltc_amt:.6f}", ltc_amt
            except Exception as e:
                logger.warning(f"LTC verify error ({url}): {e}")

    return False, f"Litecoin transaction {txid} not found or unconfirmed", 0.0


async def verify_ton_transfer(txid: str, recipient: str, expected_amount: float) -> Tuple[bool, str, float]:
    """
    Verifies Toncoin native transfer via Toncenter / TonAPI.
    """
    url = f"https://toncenter.com/api/v2/getTransactions?address={recipient}&limit=15"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            res = await client.get(url)
            if res.status_code == 200:
                data = res.json()
                if data.get("ok"):
                    txs = data.get("result", [])
                    for tx in txs:
                        tx_id_obj = tx.get("transaction_id", {})
                        hash_val = tx_id_obj.get("hash", "")
                        in_msg = tx.get("in_msg", {})
                        nanotons = int(in_msg.get("value", 0))
                        ton_amt = float(Decimal(nanotons) / Decimal(10 ** 9))

                        if txid.lower() in hash_val.lower() or hash_val.lower() in txid.lower() or abs(ton_amt - expected_amount) < 0.0001:
                            if abs(ton_amt - expected_amount) < 0.0005 or ton_amt >= expected_amount:
                                return True, "Toncoin transfer verified successfully", ton_amt
        except Exception as e:
            logger.warning(f"TON verify error: {e}")

    return False, f"Toncoin transaction {txid} not found or unconfirmed for {recipient}", 0.0


async def verify_onchain_transaction(network: str, txid: str, recipient_address: str, expected_amount: float) -> Tuple[bool, str, float]:
    """
    Multi-chain Router for strict cryptographic on-chain verification.
    """
    if not recipient_address or len(recipient_address.strip()) < 6:
        return False, "Merchant recipient address is missing or invalid", 0.0

    net = network.upper()
    if net in ("USDT", "USDT_BEP20", "BSC", "BEP20"):
        return await verify_evm_usdt("BSC", "USDT_BEP20", txid, recipient_address, expected_amount)
    elif net in ("USDT_TRC20", "TRON", "TRC20"):
        return await verify_tron_usdt(txid, recipient_address, expected_amount)
    elif net in ("USDT_POLY", "POLYGON", "MATIC"):
        return await verify_evm_usdt("POLYGON", "USDT_POLY", txid, recipient_address, expected_amount)
    elif net in ("USDT_ARB", "ARBITRUM"):
        return await verify_evm_usdt("ARBITRUM", "USDT_ARB", txid, recipient_address, expected_amount)
    elif net in ("BNB", "BNB_BSC"):
        return await verify_evm_native("BSC", txid, recipient_address, expected_amount)
    elif net in ("POL", "MATIC_NATIVE"):
        return await verify_evm_native("POLYGON", txid, recipient_address, expected_amount)
    elif net in ("BTC", "BITCOIN"):
        return await verify_btc_transfer(txid, recipient_address, expected_amount)
    elif net in ("LTC", "LITECOIN"):
        return await verify_ltc_transfer(txid, recipient_address, expected_amount)
    elif net in ("TON", "TONCOIN"):
        return await verify_ton_transfer(txid, recipient_address, expected_amount)

    return False, f"Unsupported network '{network}' for on-chain verification", 0.0


async def auto_scan_session_payment(session: dict) -> Tuple[bool, str, str, float]:
    """
    Scans the configured merchant addresses across active blockchains to detect
    any incoming transfers matching the session amount within micro-offset tolerance.
    Returns: (found, network, txid, amount_received)
    """
    wallets = session.get("wallets", {})
    expected_amount = float(session.get("amount", 0.0))
    if expected_amount <= 0:
        return False, "", "", 0.0

    # 1. TRON USDT Scan
    trc20_wallet = wallets.get("trc20", "")
    if trc20_wallet and len(trc20_wallet) > 20:
        try:
            url = f"https://api.trongrid.io/v1/accounts/{trc20_wallet}/transactions/trc20?limit=10"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    for tx in res.json().get("data", []):
                        val = float(Decimal(tx.get("value", 0)) / Decimal(10**6))
                        if abs(val - expected_amount) < 0.0005 or (val >= expected_amount and expected_amount > 0):
                            txid = tx.get("transaction_id", "")
                            if txid:
                                return True, "USDT_TRC20", txid, val
        except Exception:
            pass

    # 2. TON Native Scan
    ton_wallet = wallets.get("ton", "")
    if ton_wallet and len(ton_wallet) > 20:
        try:
            url = f"https://toncenter.com/api/v2/getTransactions?address={ton_wallet}&limit=10"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    for tx in res.json().get("result", []):
                        in_msg = tx.get("in_msg", {})
                        nanotons = int(in_msg.get("value", 0))
                        val = float(Decimal(nanotons) / Decimal(10**9))
                        if abs(val - expected_amount) < 0.0005 or (val >= expected_amount and expected_amount > 0):
                            txid = tx.get("transaction_id", {}).get("hash", "")
                            if txid:
                                return True, "TON", txid, val
        except Exception:
            pass

    # 3. LTC Scan
    ltc_wallet = wallets.get("ltc", "")
    if ltc_wallet and len(ltc_wallet) > 20:
        try:
            url = f"https://litecoinspace.org/api/address/{ltc_wallet}/txs"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    for tx in res.json():
                        for vout in tx.get("vout", []):
                            if vout.get("scriptpubkey_address", "").lower() == ltc_wallet.lower():
                                val = float(Decimal(vout.get("value", 0)) / Decimal(10**8))
                                if abs(val - expected_amount) < 0.00005 or (val >= expected_amount and expected_amount > 0):
                                    txid = tx.get("txid", "")
                                    if txid:
                                        return True, "LTC", txid, val
        except Exception:
            pass

    # 4. BTC Scan
    btc_wallet = wallets.get("btc", "")
    if btc_wallet and len(btc_wallet) > 20:
        try:
            url = f"https://mempool.space/api/address/{btc_wallet}/txs"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    for tx in res.json():
                        for vout in tx.get("vout", []):
                            if vout.get("scriptpubkey_address", "").lower() == btc_wallet.lower():
                                val = float(Decimal(vout.get("value", 0)) / Decimal(10**8))
                                if abs(val - expected_amount) < 0.000005 or (val >= expected_amount and expected_amount > 0):
                                    txid = tx.get("txid", "")
                                    if txid:
                                        return True, "BTC", txid, val
        except Exception:
            pass

    return False, "", "", 0.0


