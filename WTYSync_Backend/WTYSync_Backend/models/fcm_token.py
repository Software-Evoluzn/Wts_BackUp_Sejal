from datetime import datetime

from database.db import db


class FcmToken(db.Model):
    """One row per phone (FCM registration token) of a user.

    Created automatically by db.create_all() on the next backend start,
    nothing has to be changed in the existing tables.
    """
    __tablename__ = "fcm_tokens"

    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(200), nullable=False, index=True)
    token = db.Column(db.String(512), nullable=False, unique=True)
    platform = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, default=datetime.now, onupdate=datetime.now)
