#!/usr/bin/env python3
"""
ThreatLens Test Backends Launcher
Allows starting individual dummy backends or all of them together.
"""

import sys
import os
import subprocess
import time

BACKENDS = [
    {
        "id": "1",
        "name": "01_healthy_secure_api (FastAPI)",
        "dir": "01_healthy_secure_api",
        "port": 8001,
        "type": "python",
        "cmd": ["python", "-m", "uvicorn", "app:app", "--port", "8001"],
        "status": "🟢 Healthy Reference"
    },
    {
        "id": "2",
        "name": "02_vulnerable_ecommerce_py (Flask)",
        "dir": "02_vulnerable_ecommerce_py",
        "port": 8002,
        "type": "python",
        "cmd": ["python", "app.py"],
        "status": "🔴 Critical (SQLi, RCE, Leaked Keys)"
    },
    {
        "id": "3",
        "name": "03_vulnerable_fintech_py (FastAPI)",
        "dir": "03_vulnerable_fintech_py",
        "port": 8003,
        "type": "python",
        "cmd": ["python", "-m", "uvicorn", "app:app", "--port", "8003"],
        "status": "🟠 High (SSRF, LFI, IDOR)"
    },
    {
        "id": "4",
        "name": "04_vulnerable_social_node (Express)",
        "dir": "04_vulnerable_social_node",
        "port": 8004,
        "type": "node",
        "cmd": ["node", "server.js"],
        "status": "🔴 Critical (JWT alg:none, eval RCE, XSS)"
    },
    {
        "id": "5",
        "name": "05_vulnerable_hospital_node (Express)",
        "dir": "05_vulnerable_hospital_node",
        "port": 8005,
        "type": "node",
        "cmd": ["node", "server.js"],
        "status": "🔴 Critical (Arbitrary Upload, PHI IDOR)"
    }
]

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print("=" * 70)
    print(" 🎯 ThreatLens Dummy Test Backends Suite")
    print("=" * 70)
    
    if len(sys.argv) > 1:
        choice = sys.argv[1].strip()
    else:
        for b in BACKENDS:
            print(f"  [{b['id']}] Port {b['port']} - {b['name']}")
            print(f"      Profile: {b['status']}")
        print("  [A] Run All Backends Concurrently")
        print("=" * 70)
        choice = input("Enter backend number to launch (1-5 or A): ").strip().upper()

    targets = []
    if choice == "A" or choice == "ALL":
        targets = BACKENDS
    else:
        match = [b for b in BACKENDS if b['id'] == choice or str(b['port']) == choice]
        if match:
            targets = match
        else:
            print(f"❌ Invalid choice '{choice}'. Please select 1-5 or A.")
            sys.exit(1)

    processes = []
    print(f"\n🚀 Launching {len(targets)} backend service(s)...")

    for b in targets:
        work_dir = os.path.join(base_dir, b['dir'])
        print(f"  ▶️ Starting {b['name']} on http://localhost:{b['port']} ...")
        
        # Install node dependencies if needed
        if b['type'] == 'node' and not os.path.exists(os.path.join(work_dir, 'node_modules')):
            print(f"     📦 Installing npm packages in {b['dir']}...")
            subprocess.run(["npm", "install"], cwd=work_dir, shell=True, check=False)

        proc = subprocess.Popen(b['cmd'], cwd=work_dir, shell=True)
        processes.append((b, proc))

    print("\n✅ Target backends are running! Press Ctrl+C anytime to shut down.\n")
    print("-" * 70)
    for b, _ in processes:
        print(f"  • http://localhost:{b['port']} - {b['status']}")
    print("-" * 70)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Terminating all backend processes...")
        for b, proc in processes:
            proc.terminate()
        print("✅ All dummy backends stopped.")

if __name__ == "__main__":
    main()
