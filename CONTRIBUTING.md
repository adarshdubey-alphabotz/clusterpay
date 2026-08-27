# Contributing to ClusterPay

Thank you for your interest in contributing to ClusterPay! We welcome contributions from developers, security researchers, and Web3 enthusiasts.

## How to Contribute

1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/amazing-feature`)
3. **Commit Your Changes** (`git commit -m 'feat: Add support for Arbitrum USDC'`)
4. **Push to the Branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

## Development Setup

```bash
# Clone the repository
git clone https://github.com/adarshdubey-alphabotz/clusterpay.git
cd clusterpay

# Set up Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run the test server
uvicorn src.main:app --reload --port 8085
```

## Security Vulnerability Reporting

If you discover a security vulnerability, please do **NOT** open a public issue. Instead, report it directly to `security@rapidx.me` or via our security bug bounty channel.
