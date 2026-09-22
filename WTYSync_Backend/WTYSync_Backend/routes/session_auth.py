"""
Auto Login sessions (backend-controlled "Remember me").

POST /api/auth/session             create a session after a real login
POST /api/auth/session/refresh     validate + rotate on app launch
POST /api/auth/session/logout      revoke this phone's session
POST /api/auth/session/logout-all  revoke every session of the user

Security
- Sessions are only created with a verified Firebase ID token.
- Refresh tokens are random, stored hashed, expire after SESSION_DAYS
  and are rotated on every use.
- Re-using an already rotated token (a sign of a copied token) revokes
  all of that user's sessions.
- A session stops working if the user is removed from the users table.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request

from database.db import db
from models.user import User
from models.user_session import UserSession
from utils.firebase_token import InvalidFirebaseToken, verify_firebase_id_token

session_auth_bp = Blueprint("session_auth", __name__)

SESSION_DAYS = 30
MAX_SESSIONS_PER_USER = 10


def _hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _new_token():
    return secrets.token_urlsafe(48)


def _user_payload(user):
    return {
        "firebase_uid": user.firebase_uid,
        "name": user.name,
        "email": user.email,
        "contact": user.contact,
    }


def _error(status, code, message):
    return jsonify({"success": False, "code": code, "message": message}), status


def _revoke_all(firebase_uid, reason):
    now = datetime.utcnow()
    UserSession.query.filter(
        UserSession.firebase_uid == firebase_uid,
        UserSession.revoked_at.is_(None),
    ).update({"revoked_at": now, "revoked_reason": reason}, synchronize_session=False)


def _verified_uid_from_request(data):
    try:
        return verify_firebase_id_token(data.get("id_token")), None
    except InvalidFirebaseToken as e:
        print("[session] invalid Firebase token:", e)
        return None, _error(401, "invalid_id_token", "Login could not be verified")
    except RuntimeError as e:
        print("[session] configuration error:", e)
        return None, _error(500, "server_not_configured", "Auto Login is not configured on the server")


@session_auth_bp.route("/api/auth/session", methods=["POST"])
def create_session():
    data = request.get_json(silent=True) or {}
    uid, err = _verified_uid_from_request(data)
    if err:
        return err

    now = datetime.utcnow()
    token = _new_token()

    try:
        # Keep the table tidy: drop this user's expired/revoked rows and cap active sessions
        UserSession.query.filter(
            UserSession.firebase_uid == uid,
            db.or_(UserSession.revoked_at.isnot(None), UserSession.expires_at <= now),
        ).delete(synchronize_session=False)

        active = (
            UserSession.query.filter_by(firebase_uid=uid)
            .order_by(UserSession.last_used_at.desc())
            .all()
        )
        for old in active[MAX_SESSIONS_PER_USER - 1:]:
            old.revoked_at = now
            old.revoked_reason = "session_limit"

        session = UserSession(
            firebase_uid=uid,
            token_hash=_hash(token),
            device_name=(data.get("device_name") or "")[:120] or None,
            created_at=now,
            last_used_at=now,
            expires_at=now + timedelta(days=SESSION_DAYS),
        )
        db.session.add(session)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("[session] create failed:", e)
        return _error(500, "server_error", "Could not create session")

    user = User.query.filter_by(firebase_uid=uid).first()
    return jsonify({
        "success": True,
        "refresh_token": token,
        "expires_at": session.expires_at.isoformat() + "Z",
        "user": _user_payload(user) if user else None,
    }), 201


@session_auth_bp.route("/api/auth/session/refresh", methods=["POST"])
def refresh_session():
    data = request.get_json(silent=True) or {}
    token = data.get("refresh_token")
    if not token or not isinstance(token, str):
        return _error(400, "missing_token", "refresh_token is required")

    now = datetime.utcnow()
    session = UserSession.query.filter_by(token_hash=_hash(token)).first()

    if not session:
        return _error(401, "invalid_session", "Session not found")

    if session.revoked_at is not None:
        if session.revoked_reason == "rotated":
            # An old token was used again: treat as stolen, sign out everywhere
            _revoke_all(session.firebase_uid, "reuse_detected")
            db.session.commit()
            print(f"[session] token reuse detected for {session.firebase_uid}")
        return _error(401, "session_revoked", "Session is no longer valid")

    if session.expires_at <= now:
        return _error(401, "session_expired", "Session expired")

    user = User.query.filter_by(firebase_uid=session.firebase_uid).first()
    if not user:
        session.revoked_at = now
        session.revoked_reason = "account_removed"
        db.session.commit()
        return _error(401, "account_not_found", "Account no longer exists")

    new_token = _new_token()
    try:
        session.revoked_at = now
        session.revoked_reason = "rotated"
        replacement = UserSession(
            firebase_uid=session.firebase_uid,
            token_hash=_hash(new_token),
            device_name=session.device_name,
            created_at=session.created_at,
            last_used_at=now,
            expires_at=now + timedelta(days=SESSION_DAYS),
        )
        db.session.add(replacement)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("[session] refresh failed:", e)
        return _error(500, "server_error", "Could not refresh session")

    return jsonify({
        "success": True,
        "refresh_token": new_token,
        "expires_at": replacement.expires_at.isoformat() + "Z",
        "user": _user_payload(user),
    }), 200


@session_auth_bp.route("/api/auth/session/logout", methods=["POST"])
def logout_session():
    data = request.get_json(silent=True) or {}
    token = data.get("refresh_token")
    if token and isinstance(token, str):
        session = UserSession.query.filter_by(token_hash=_hash(token)).first()
        if session and session.revoked_at is None:
            session.revoked_at = datetime.utcnow()
            session.revoked_reason = "logout"
            db.session.commit()
    # Always succeed so logout never gets stuck
    return jsonify({"success": True}), 200


@session_auth_bp.route("/api/auth/session/logout-all", methods=["POST"])
def logout_all_sessions():
    data = request.get_json(silent=True) or {}
    uid, err = _verified_uid_from_request(data)
    if err:
        return err
    _revoke_all(uid, "logout_all")
    db.session.commit()
    return jsonify({"success": True}), 200
