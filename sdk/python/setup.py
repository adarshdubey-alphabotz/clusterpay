from setuptools import setup, find_packages

setup(
    name="clusterpay",
    version="2.0.0",
    description="Official Python SDK for ClusterPay Cryptocurrency Merchant Gateway",
    author="ClusterPay Technologies",
    packages=find_packages(),
    install_requires=["httpx>=0.27.0"],
    python_requires=">=3.8",
)
