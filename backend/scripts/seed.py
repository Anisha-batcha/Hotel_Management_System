import os

import bcrypt
import mysql.connector
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

ADMIN = {
    "full_name": "Hotel Admin",
    "email": "admin@hotel.com",
    "password": "Admin123!",
    "phone": "9999999999",
    "role": "admin",
}
DEMO_USER = {
    "full_name": "Asha Rao",
    "email": "asha@example.com",
    "password": "User123!",
    "phone": "9876543210",
    "role": "user",
}


def upsert_user(payload):
    connection = mysql.connector.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", "3306")),
        user=os.getenv("DB_USER", "anisha"),
        password=os.getenv("DB_PASSWORD", "123"),
        database=os.getenv("DB_NAME", "hotel_management"),
        autocommit=True,
        charset="utf8mb4",
        use_pure=True,
    )
    cursor = connection.cursor()
    cursor.execute("SELECT id FROM users WHERE email = %s", (payload["email"],))
    if cursor.fetchone():
        print(f"Skipped (already exists): {payload['email']}")
        connection.close()
        return

    password_hash = bcrypt.hashpw(payload["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    cursor.execute(
        "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (%s, %s, %s, %s, %s)",
        (payload["full_name"], payload["email"], password_hash, payload["phone"], payload["role"]),
    )
    print(f"Created: {payload['email']} / {payload['password']}")
    connection.close()


if __name__ == "__main__":
    upsert_user(ADMIN)
    upsert_user(DEMO_USER)
    print("Seeding complete.")
