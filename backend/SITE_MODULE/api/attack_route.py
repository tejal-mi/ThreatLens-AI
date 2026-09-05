import time
from collections import defaultdict, deque
from connect import auth
from fastapi import APIRouter, Depends, HTTPException, status
from SITE_MODULE.schema.attack import AttackCreate
from SITE_MODULE.service.attack_service import (
    post_attack,
    get_attack
)

router = APIRouter(
    prefix="/attack",
    tags=["Attack"],
)

# Sliding window rate limiter with deque pruning
_REQUEST_HISTORY = defaultdict(deque)
_WHITELIST = {"127.0.0.1", "localhost", "::1"}
_WINDOW_SECONDS = 60
_MAX_REQUESTS_PER_WINDOW = 120

def _check_rate_limit(ip: str) -> bool:
    if ip in _WHITELIST:
        return True
    
    now = time.time()
    queue = _REQUEST_HISTORY[ip]
    while queue and now - queue[0] > _WINDOW_SECONDS:
        queue.popleft()
    
    if len(queue) >= _MAX_REQUESTS_PER_WINDOW:
        return False
    queue.append(now)
    return True


@router.post("")
def post_attack_route(
    attack: AttackCreate,
    user: dict = Depends(auth.deps.get_current),
):
    account_id = user["account"]["id"]
    if not _check_rate_limit("127.0.0.1"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please retry in 60 seconds."
        )

    return post_attack(
        account_id=account_id,
        **attack.model_dump(),
    )


@router.get("")
def get_attack_route(
    attack_type: str = None,
    page: int = 1,
    limit: int = 10,
    user: dict = Depends(auth.deps.get_current),
):
    account_id = user["account"]["id"]

    return get_attack(
        account_id=account_id,
        attack_type=attack_type,
        page=page,
        limit=limit,
    )
