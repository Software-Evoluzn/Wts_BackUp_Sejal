import smtplib
import time
import requests
import ssl
from concurrent.futures import ThreadPoolExecutor
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import render_template

from fcm_service import send_push_to_user

# ------------------------------------------------------------------
# Email (SMTP / Gmail App Password) - same pattern as the WTS project
# ------------------------------------------------------------------
SMTP_SERVER = 'smtp.gmail.com'
SMTP_PORT = 587
SENDER_EMAIL = "evoluzn999@gmail.com"
SENDER_NAME = "Evoluzn Team"
SENDER_PASSWORD = "ewmjsmoehhhvnxuz"  # Gmail App Password

# ------------------------------------------------------------------
# SMS (Fast2SMS DLT route) - same pattern as the smoke-detector project
# ------------------------------------------------------------------
FAST2SMS_API_KEY = "bpNGDhrI3AEHXMJdzsiuPWlRTt10CjoUVYFfcg9m2qS8Z65kKy6VS3s1wGZTfEFC4n8boLtPlAcxOvkN"


# ------------------------------------------------------------------
# Background workers
# ------------------------------------------------------------------
# Email and SMS are slow network calls (SMTP login + send can take several
# seconds, Fast2SMS is an HTTP call). They must NEVER run inside the MQTT
# callback thread, otherwise every incoming MQTT message (and the live
# Socket.IO emit) waits for them. They run in this small pool instead, and
# email + SMS run in parallel so SMS does not wait for email.
_alert_pool = ThreadPoolExecutor(max_workers=8, thread_name_prefix="alert")

NETWORK_TIMEOUT = 10  # seconds, so a dead SMTP/SMS server can never hang a worker


def send_threshold_email(to_email, serial_no, exceeded_phases, threshold, current_time):
    """Send a threshold-exceeded email alert for one device."""
    if not to_email:
        print(f"ℹ️ No alert_email set for {serial_no}, skipping email.")
        return

    started = time.time()
    try:
        html_body = render_template(
            "alert.html",
            serial_number=serial_no,
            threshold=threshold,
            exceeded_phases=', '.join(exceeded_phases),
            timestamp=current_time.strftime("%d %b %Y, %I:%M %p")
        )

        msg = MIMEMultipart("alternative")
        msg['From'] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg['To'] = to_email
        msg['Subject'] = f"⚠️ Temperature Alert for {serial_no} (Phases: {', '.join(exceeded_phases)})"
        msg.attach(MIMEText(html_body, 'html'))

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT, timeout=NETWORK_TIMEOUT) as server:
            server.starttls()
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, [to_email], msg.as_string())

        print(f"📧 Alert email sent to {to_email} for {serial_no} (took {time.time() - started:.1f}s)")

    except Exception as e:
        print(f"❌ Email send failed for {serial_no} after {time.time() - started:.1f}s: {e}")


# DLT variables are limited to 30 characters. The approved template (ID 217514)
# has 3 slots: "ALERT: {#var#} / Device ID: {#var#} / Time: {#var#}".
# A 4th value is silently dropped by Fast2SMS, so the exceeded probes are put
# inside slot 1 instead: "ALERT: TEMP EXCEEDED R1,Y1".
SMS_VAR_MAX = 30


def build_sms_alert_text(exceeded_phases, prefix="TEMP EXCEEDED"):
    """'TEMP EXCEEDED R1,Y1' - as many probe names as fit in 30 chars, then '+N'."""
    names = [str(p) for p in exceeded_phases]
    total = len(names)
    if total == 0:
        return prefix
    for keep in range(total, 0, -1):
        text = ",".join(names[:keep]) + (f"+{total - keep}" if keep < total else "")
        candidate = f"{prefix} {text}"
        if len(candidate) <= SMS_VAR_MAX:
            return candidate
    return prefix  # extremely unlikely, keeps the SMS valid


def send_threshold_sms(mobile_number, serial_no, exceeded_phases, current_time):
    """Send a threshold-exceeded SMS alert for one device."""
    if not mobile_number:
        print(f"ℹ️ No sms_phone set for {serial_no}, skipping SMS.")
        return

    started = time.time()
    try:
        formatted_time = current_time.strftime("%d %b %Y %H:%M:%S")

        if isinstance(exceeded_phases, list):
            phases_str = ", ".join(str(p) for p in exceeded_phases)
        else:
            phases_str = str(exceeded_phases)

        url = "https://www.fast2sms.com/dev/bulkV2"
        params = {
            "authorization": FAST2SMS_API_KEY,
            "route": "dlt",
            "sender_id": "EVZIND",
            "message": "217514",  # DLT-approved template ID
            "variables_values": f"{build_sms_alert_text(exceeded_phases)}|{serial_no}|{formatted_time}",
            "numbers": mobile_number
        }

        response = requests.get(url, params=params, timeout=NETWORK_TIMEOUT)
        print(f"📱 SMS status for {serial_no}: {response.status_code} | {response.text} "
              f"(took {time.time() - started:.1f}s)")

    except Exception as e:
        print(f"❌ SMS send failed for {serial_no} after {time.time() - started:.1f}s: {e}")


def _run_in_app_context(app, func, **kwargs):
    # render_template() needs a Flask app context, and worker threads don't have one.
    with app.app_context():
        func(**kwargs)


def dispatch_threshold_alerts(app, serial_no, exceeded_phases, threshold, current_time,
                              email_to=None, sms_to=None,
                              push_uid=None, push_title=None, push_body=None, push_data=None):
    """
    Fire-and-forget. Returns immediately (microseconds); the push notification,
    the email and the SMS are sent by background workers, in parallel.

    `app` must be the real Flask app object (use current_app._get_current_object()).
    Only plain values are passed in. The push worker reads the user's phone
    tokens from the database, so it runs inside its own app context.
    """
    # Push first: it is the fastest channel to the user's phone.
    if push_uid:
        _alert_pool.submit(
            _run_in_app_context, app, send_push_to_user,
            firebase_uid=push_uid, title=push_title, body=push_body, data=push_data,
        )
    if email_to:
        _alert_pool.submit(
            _run_in_app_context, app, send_threshold_email,
            to_email=email_to, serial_no=serial_no,
            exceeded_phases=list(exceeded_phases),
            threshold=threshold, current_time=current_time,
        )
    if sms_to:
        _alert_pool.submit(
            _run_in_app_context, app, send_threshold_sms,
            mobile_number=sms_to, serial_no=serial_no,
            exceeded_phases=list(exceeded_phases),
            current_time=current_time,
        )
