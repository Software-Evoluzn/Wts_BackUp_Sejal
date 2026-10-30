"""
Push notification endpoints (all need the user's Firebase ID token, so nobody
can register a phone for, or send a test to, somebody else's account).

POST /api/push/register     { id_token, fcm_token, platform }
POST /api/push/unregister   { id_token, fcm_token }
POST /api/push/test         { id_token }   -> sends a test notification to your phones
"""
from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy.exc import IntegrityError

from database.db import db
from fcm_service import send_push_to_user
from models.fcm_token import FcmToken
from utils.firebase_token import InvalidFirebaseToken, verify_firebase_id_token

push_bp = Blueprint("push", __name__)

MAX_TOKENS_PER_USER = 10


def _error(status, message):
    return jsonify({"success": False, "message": message}), status


def _verified_uid(data):
    try:
        return verify_firebase_id_token(data.get("id_token")), None
    except InvalidFirebaseToken as e:
        print("[push] invalid Firebase token:", e)
        return None, _error(401, "Login could not be verified")
    except RuntimeError as e:
        print("[push] configuration error:", e)
        return None, _error(500, "Server is not configured")


@push_bp.route("/api/push/register", methods=["POST"])
def register_token():
    data = request.get_json(silent=True) or {}
    uid, err = _verified_uid(data)
    if err:
        return err

    token = (data.get("fcm_token") or "").strip()
    if not token or len(token) > 512:
        return _error(400, "fcm_token is required")

    try:
        row = FcmToken.query.filter_by(token=token).first()
        if row:
            # Same phone, possibly a different account logged in now -> move it
            row.firebase_uid = uid
            row.platform = data.get("platform") or row.platform
            row.updated_at = datetime.now()
        else:
            db.session.add(FcmToken(firebase_uid=uid, token=token, platform=data.get("platform")))
        db.session.flush()

        # Keep only the newest phones per user
        rows = (
            FcmToken.query.filter_by(firebase_uid=uid)
            .order_by(FcmToken.updated_at.desc())
            .all()
        )
        for old in rows[MAX_TOKENS_PER_USER:]:
            db.session.delete(old)

        db.session.commit()
    except IntegrityError:
        db.session.rollback()   # two requests registered the same token at once, fine
    except Exception as e:
        db.session.rollback()
        print("[push] register failed:", e)
        return _error(500, "Could not register this phone")

    return jsonify({"success": True}), 200


@push_bp.route("/api/push/unregister", methods=["POST"])
def unregister_token():
    data = request.get_json(silent=True) or {}
    uid, err = _verified_uid(data)
    if err:
        return err

    token = (data.get("fcm_token") or "").strip()
    if not token:
        return _error(400, "fcm_token is required")

    try:
        FcmToken.query.filter_by(token=token, firebase_uid=uid).delete(synchronize_session=False)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("[push] unregister failed:", e)
        return _error(500, "Could not unregister this phone")

    return jsonify({"success": True}), 200


@push_bp.route("/api/push/test", methods=["POST"])
def send_test():
    data = request.get_json(silent=True) or {}
    uid, err = _verified_uid(data)
    if err:
        return err

    try:
        result = send_push_to_user(
            uid, "Test notification", "Push notifications are working ✅", {"type": "test"}
        )
    except RuntimeError as e:
        return _error(500, str(e))
    return jsonify({"success": True, **result}), 200
