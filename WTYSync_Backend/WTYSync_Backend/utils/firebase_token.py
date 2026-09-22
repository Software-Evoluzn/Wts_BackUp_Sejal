"""
Verifies Firebase ID tokens sent by the app.

Uses Google's public signing keys, so no Firebase service-account file is
needed, only your Firebase project ID (FIREBASE_PROJECT_ID in config.py or
as an environment variable).
"""
import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from config import Config

_request = google_requests.Request()


class InvalidFirebaseToken(Exception):
    pass


def _project_id():
    project_id = os.environ.get("FIREBASE_PROJECT_ID") or getattr(Config, "FIREBASE_PROJECT_ID", "")
    if not project_id:
        raise RuntimeError("FIREBASE_PROJECT_ID is not configured")
    return project_id


def verify_firebase_id_token(token):
    """Returns the verified Firebase uid, or raises InvalidFirebaseToken."""
    if not token or not isinstance(token, str):
        raise InvalidFirebaseToken("Missing ID token")

    project_id = _project_id()

    try:
        claims = google_id_token.verify_firebase_token(
            token, _request, audience=project_id, clock_skew_in_seconds=10
        )
    except TypeError:
        # Older google-auth versions have no clock_skew_in_seconds
        claims = google_id_token.verify_firebase_token(token, _request, audience=project_id)
    except Exception as e:
        raise InvalidFirebaseToken(str(e))

    if not claims or claims.get("iss") != f"https://securetoken.google.com/{project_id}":
        raise InvalidFirebaseToken("Token was not issued for this Firebase project")

    uid = claims.get("sub") or claims.get("user_id")
    if not uid:
        raise InvalidFirebaseToken("Token has no user id")
    return uid
