"""Smoke test & verification harness for blockchain and email reporting."""
import sys
from BLOCKCHAIN_MODULE.service.config import config
from BLOCKCHAIN_MODULE.service.builder_service import build_chain
from SITE_MODULE.service.email_service import attack_report_template

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
        
        # Test attack report template generation
        sample_attack = {
            "id": 1,
            "attack_type": "ddos",
            "attack_id": "test-attack-001",
            "status": {"status": "completed", "performance": {"requests_per_second": 50}},
            "request": {"target": {"base_url": "https://api.test", "endpoint": "/api/v1"}}
        }
        html = attack_report_template(attack=sample_attack)
        assert "ThreadLens" in html
        print("[OK] Attack report email template generated successfully.")
        return 0
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(run_smoke_test())
