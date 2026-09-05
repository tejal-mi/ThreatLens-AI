from SITE_MODULE.db import Attack
from connect import session_factory
from utils.get_helper import to_dict , to_list_dict


def post_attack(
    account_id: int,
    attack_id: str,
    attack_type: str,
    request: dict,
    status: str,
    plot: dict,
) -> Attack:
    
    db = session_factory()
    attack = Attack(
        account_id=account_id,
        attack_id=attack_id,
        attack_type=attack_type,
        request=request,
        status=status,
        plot=plot,
    )
    db.add(attack)
    db.commit()
    return to_dict(attack)



def get_attack(
    account_id: int,
    page: int = 1,
    limit: int = 10,
    attack_type: str = None,
) -> list[dict]:

    db = session_factory()

    try:
        query = (
            db.query(Attack)
            .filter(Attack.account_id == account_id)
        )

        if attack_type:
            query = query.filter(
                Attack.attack_type == attack_type
            )

        attacks = (
            query
            .order_by(Attack.created_at.desc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

        return to_list_dict(attacks)

    finally:
        db.close()