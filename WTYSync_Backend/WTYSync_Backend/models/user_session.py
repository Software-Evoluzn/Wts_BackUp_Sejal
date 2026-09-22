from datetime import datetime

from database.db import db


class UserSession(db.Model):
    """
    One "Auto Login" session per phone.

    The app keeps a random refresh token in the phone's secure storage.
    Only a SHA-256 hash of that token is stored here, so a database leak
    cannot be used to log in as anyone.
    """
    __tablename__ = "user_sessions"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(150), nullable=False, index=True)
    token_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    device_name = db.Column(db.String(120))

    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    last_used_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)

    revoked_at = db.Column(db.DateTime, nullable=True)
    revoked_reason = db.Column(db.String(40), nullable=True)  # logout, rotated, reuse_detected ...

    @property
    def is_active(self):
        return self.revoked_at is None and self.expires_at > datetime.utcnow()
