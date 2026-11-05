import smtplib
import requests
import ssl

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import render_template
import google.auth
from google.auth.transport.requests import Request
from google.oauth2 import service_account


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
# Push Notification Setup (FCM v1 without Service Account JSON)
# ------------------------------------------------------------------
PROJECT_ID = "thermidity-37a89"
FCM_ENDPOINT = f"https://fcm.googleapis.com/v1/projects/{PROJECT_ID}/messages:send"

SERVICE_ACCOUNT_FILE = 'service_account.json'

def get_access_token():
    print("enter into the get_access_token")
    """Dynamically fetches OAuth2 access token using Firebase Service Account JSON """
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/firebase.messaging"]
    )
    print("sejal inside  get access token")
    credentials.refresh(Request())
    return credentials.token

def send_push_notification(fcm_token, serial_no, alert_message):
    """Send Mobile Push Notification to app (Works in Killed/Background/Foreground)."""
    print("sejal comes in send_push_notification")
    if not fcm_token:
        print(f"ℹ️ No FCM Token set for {serial_no}, skipping Push Notification.")
        return

    try:
        print("sejal comes in send_push_notification try block")
        token = get_access_token()
        print("sejal want to see token: ",token)
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; UTF-8"
        }
        print("sejal want to see headers: ",headers)

        payload = {
            "message": {
                "token": fcm_token,
                "notification": {
                    "title": f"⚠️ Temperature Alert ({serial_no})",
                    "body": alert_message
                },
                "data": {
                    "serial_no": str(serial_no),
                    "message": str(alert_message),
                    "type": "ALERT"
                },
                "android": {
                    "priority": "high",
                    "notification": {
                        "channel_id": "high_priority_alerts",
                        "sound": "default"
                    }
                }
            }
        }
        print("sejal want to see payload: " , payload)

        response = requests.post(FCM_ENDPOINT, headers=headers, json=payload)
        print("sejal want to see response: ",response)
        if response.status_code == 200:
            print(f"🔔 Push notification sent to device {serial_no}")
        else:
            print(f"❌ Push notification failed ({response.status_code}): {response.text}")

    except Exception as e:
        print(f"❌ Error sending FCM Push notification: {e}")


def send_threshold_email(to_email, serial_no, exceeded_phases, threshold, current_time):
    print("enter in this funtion ")
    """Send a threshold-exceeded email alert for one device."""
    if not to_email:
        print(f"ℹ️ No alert_email set for {serial_no}, skipping email.")
        return

    try:
        print("here first come sejal")
        html_body = render_template(
            "alert.html",
            serial_number=serial_no,
            threshold=threshold,
            exceeded_phases=', '.join(exceeded_phases),
            timestamp=current_time.strftime("%d %b %Y, %I:%M %p")
        )
        print("here come sejal")

        msg = MIMEMultipart("alternative")
        print("msg of " , msg)
        msg['From'] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        print("msg of from " , msg['From'])
        msg['To'] = to_email
        print("msg of to " , msg['To'])
        msg['Subject'] = f"⚠️ Temperature Alert for {serial_no} (Phases: {', '.join(exceeded_phases)})"
        print("msg of subject " , msg['Subject'])
        msg.attach(MIMEText(html_body, 'html'))
      
        print("now come here inside this after message MIMIETEXT")

        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        print("msg of  " , server)
        server.starttls()
        print("servr start")
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        print("server login")
        server.sendmail(SENDER_EMAIL, [to_email], msg.as_string())
        print("server send email")
        server.quit()

        print(f"📧 Alert email sent to {to_email} for {serial_no}")

    except Exception as e:
        print(f"❌ Email send failed for {serial_no}: {e}")


def send_threshold_sms(mobile_number, serial_no, exceeded_phases, current_time):
    """Send a threshold-exceeded SMS alert for one device."""
    if not mobile_number:
        print(f"ℹ️ No sms_phone set for {serial_no}, skipping SMS.")
        return

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
            "variables_values": f"TEMP EXCEEDED|{serial_no}|{formatted_time}|{phases_str}",
            "numbers": mobile_number
        }

        response = requests.get(url, params=params)
        print(f"📱 SMS status for {serial_no}: {response.status_code} | {response.text}")

    except Exception as e:
        print(f"❌ SMS send failed for {serial_no}: {e}")
        
        
        
