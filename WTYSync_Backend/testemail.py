import smtplib
with smtplib.SMTP("smtp.gmail.com", 587, timeout=30) as s:
    s.starttls()
    s.login("evoluzn999@gmail.com", "ewmjsmoehhhvnxuz")
    print("Login OK")