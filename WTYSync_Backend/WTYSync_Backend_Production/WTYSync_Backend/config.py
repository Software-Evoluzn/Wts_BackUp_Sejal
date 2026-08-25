import os

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://shilpa:Evoluzn%40123@evoluzn.org/react_native_wts"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False