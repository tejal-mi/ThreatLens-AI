"""Sanitized smoke test for internal chain integrity verification."""
import sys
from BLOCKCHAIN_MODULE.service.config import config
from BLOCKCHAIN_MODULE.service.builder_service import build_chain

def run_smoke_test():
    mock_user = {
        "account": {
            "id": 1,
            "uid": "00000000-0000-0000-0000-000000000001",
            "name": "Test User",
            "handle": "testuser",
            "email": "test@threatlens.ai",
            "role": "admin",
            "status": "active",
        }
    }
    
    try:
        chain = build_chain(config=config, user=mock_user)
        print("[OK] InternalChain initialized successfully.")
        print(f"[OK] Chain length: {len(chain.chain)}")
        return 0
    except Exception as e:
        print(f"[ERROR] Chain initialization failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(run_smoke_test())
