"""
Sends push notifications through Firebase Cloud Messaging (HTTP v1 API).

Setup (pick ONE):

  A) Key file (simplest).
     Firebase Console -> Project settings -> Service accounts -> Generate new private key
     Save it as  firebase-service-account.json  next to this file
     (or put its path in the FIREBASE_SERVICE_ACCOUNT_FILE environment variable).
     NEVER commit this file to GitHub, it is a password for your whole Firebase project.

  B) No key file (use this when an organization policy blocks key creation).
     Install the Google Cloud CLI once, then run, on the machine that runs the backend:
       gcloud auth application-default login --impersonate-service-account=<SERVICE_ACCOUNT_EMAIL>
     e.g. firebase-adminsdk-fbsvc@wiretempsync-f87c0.iam.gserviceaccount.com
     Your Google account needs the "Service Account Token Creator" role on that service account.
     If the key file from (A) is missing, this is used automatically.

Quick self-test of the key + a phone token (no MQTT / alert needed):
  python fcm_service.py <fcm_token_printed_by_the_app>
"""
import os
import sys
import threading


from config import Config
from database.db import db
from models.fcm_token import FcmToken

SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"]
ALERT_CHANNEL_ID = "temperature_alerts"   # must match the channel the app creates
TTL_SECONDS = 3600                        # deliver late if the phone was offline, but not after 1 h
HTTP_TIMEOUT = 10

_lock = threading.Lock()
_credentials = None
_project_id = None


def _key_path():
    return os.environ.get("FIREBASE_SERVICE_ACCOUNT_FILE") or os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "firebase-service-account.json"
    )


def _load_credentials():
    """Key file if there is one, otherwise Application Default Credentials."""
    import google.auth                      # imported here, not at the top, so that a problem
    from google.oauth2 import service_account  # with these libraries can never stop the backend starting

    path = _key_path()
    if os.path.exists(path):
        creds = service_account.Credentials.from_service_account_file(path, scopes=SCOPES)
        return creds, creds.project_id

    try:
        creds, project = google.auth.default(scopes=SCOPES)
    except Exception as e:
        raise RuntimeError(
            f"No Firebase credentials. Either save a key as {path} or run: "
            "gcloud auth application-default login --impersonate-service-account=<SERVICE_ACCOUNT_EMAIL>"
            f" ({e})"
        )
    project = project or os.environ.get("FIREBASE_PROJECT_ID") or getattr(Config, "FIREBASE_PROJECT_ID", "")
    if not project:
        raise RuntimeError("FIREBASE_PROJECT_ID is not configured")
    return creds, project


def _get_access_token():
    """Returns (access_token, project_id). Cached, refreshed automatically."""
    global _credentials, _project_id
    from google.auth.transport.requests import Request as GoogleRequest

    with _lock:
        if _credentials is None:
            _credentials, _project_id = _load_credentials()
        if not _credentials.valid:
            try:
                _credentials.refresh(GoogleRequest())
            except Exception:
                # e.g. "Reauthentication is needed": forget the cached login so the next
                # push re-reads the saved login file (no backend restart needed after
                # running `gcloud auth application-default login` again).
                _credentials = None
                raise
        return _credentials.token, _project_id


def send_to_token(token, title, body, data=None):
    """Sends one notification. Returns 'ok', 'unregistered' (token is dead) or 'error'."""
    import requests

    access_token, project_id = _get_access_token()

    message = {
        "message": {
            "token": token,
            "notification": {"title": title, "body": body},
            # FCM data values must all be strings
            "data": {str(k): str(v) for k, v in (data or {}).items()},
            "android": {
                "priority": "HIGH",
                "ttl": f"{TTL_SECONDS}s",
                "notification": {"channel_id": ALERT_CHANNEL_ID, "sound": "default"},
            },
        }
    }

    resp = requests.post(
        f"https://fcm.googleapis.com/v1/projects/{project_id}/messages:send",
        headers={"Authorization": f"Bearer {access_token}"},
        json=message,
        timeout=HTTP_TIMEOUT,
    )
    if resp.status_code == 200:
        return "ok"

    try:
        err = resp.json().get("error", {})
    except ValueError:
        err = {}
    codes = [d.get("errorCode") for d in err.get("details", []) if isinstance(d, dict)]
    if "UNREGISTERED" in codes or err.get("status") == "NOT_FOUND":
        return "unregistered"

    print(f"❌ FCM error {resp.status_code}: {resp.text[:300]}")
    return "error"


def send_push_to_user(firebase_uid, title, body, data=None):
    """Sends to every phone registered for this user. Needs a Flask app context.
    Tokens FCM reports as dead (app uninstalled / data cleared) are deleted."""
    result = {"sent": 0, "failed": 0, "removed": 0}
    if not firebase_uid:
        return result

    try:
        rows = FcmToken.query.filter_by(firebase_uid=firebase_uid).all()
        if not rows:
            print(f"ℹ️ No phone registered for push (uid {firebase_uid[:8]}...), skipping push.")
            return result

        for row in rows:
            try:
                outcome = send_to_token(row.token, title, body, data)
            except Exception as e:
                print(f"❌ Push send failed: {e}")
                outcome = "error"

            if outcome == "ok":
                result["sent"] += 1
            elif outcome == "unregistered":
                db.session.delete(row)
                result["removed"] += 1
            else:
                result["failed"] += 1

        if result["removed"]:
            db.session.commit()
        print(f"🔔 Push for uid {firebase_uid[:8]}...: {result}")
    except Exception as e:
        db.session.rollback()
        print(f"❌ Push for uid {firebase_uid[:8]}... failed: {e}")
    return result


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python fcm_service.py <fcm_token>")
        sys.exit(1)
    print("result:", send_to_token(sys.argv[1], "Test notification", "FCM is working ✅", {"type": "test"}))