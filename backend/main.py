import os
from datetime import datetime
from typing import Annotated, Any

import jwt
import mysql.connector
import bcrypt
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover
    OpenAI = None

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Hotel Management API", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CLIENT_ORIGIN", "http://localhost:4200"), "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "anisha"),
    "password": os.getenv("DB_PASSWORD", "123"),
    "database": os.getenv("DB_NAME", "hotel_management"),
    "autocommit": True,
    "charset": "utf8mb4",
    "use_pure": True,
}

JWT_SECRET = os.getenv("JWT_SECRET", "hotel_management_dev_secret_change_me")
JWT_EXPIRES_IN = os.getenv("JWT_EXPIRES_IN", "7d")


def parse_token_expiry(value: str) -> int:
    if value.endswith("d"):
        return int(value[:-1]) * 86400
    if value.endswith("h"):
        return int(value[:-1]) * 3600
    if value.endswith("m"):
        return int(value[:-1]) * 60
    return int(value)


def get_db():
    connection = mysql.connector.connect(**DB_CONFIG)
    try:
        yield connection
    finally:
        connection.close()


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def sign_token(user: dict) -> str:
    payload = {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "full_name": user["full_name"],
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def get_current_user(authorization: Annotated[str | None, Header(alias="Authorization")] = None):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token missing")

    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc


def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1)
    email: str
    password: str = Field(..., min_length=6)
    phone: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)


class RoomPayload(BaseModel):
    room_number: str | None = None
    room_type: str | None = None
    price_per_night: float | None = None
    capacity: int | None = 2
    description: str | None = None
    amenities: str | None = None
    image_url: str | None = None
    status: str | None = None


class BookingPayload(BaseModel):
    room_id: int
    check_in: str
    check_out: str
    guests: int = 1
    special_requests: str | None = None


class BookingStatusUpdate(BaseModel):
    status: str


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "hotel-management-api"}


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=500)


def build_fallback_reply(message: str, room_lines: list[str]) -> str:
    normalized = message.strip()
    if not normalized:
        return "I can help with hotel room options and stay planning."

    if room_lines:
        room_preview = "\n".join(room_lines[:3])
        return (
            f'You asked: "{normalized}". I can help narrow this down with the current hotel inventory:\n'
            f"{room_preview}"
        )

    return f'You asked: "{normalized}". I can help narrow this down with the current hotel inventory, but there are no rooms loaded yet.'


@app.post("/api/chat")
def chat(payload: ChatRequest, db=Depends(get_db)):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT room_number, room_type, price_per_night, capacity, status FROM rooms ORDER BY price_per_night ASC LIMIT 8"
    )
    rooms = cursor.fetchall()
    room_lines = []
    for room in rooms:
        room_lines.append(
            f"Room {room['room_number']} | {room['room_type']} | {room['status']} | {room['capacity']} guests | ${float(room['price_per_night']):.2f}/night"
        )

    context = "\n".join(room_lines) if room_lines else "No rooms are currently available in the database."
    lowercase = message.lower()

    if os.getenv("OPENAI_API_KEY") and OpenAI is not None:
        try:
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
            response = client.responses.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                input=[
                    {
                        "role": "system",
                        "content": "You are an AI concierge for Aurelia Hotel. Answer in a warm, helpful tone. Use only the hotel data and do not invent unavailable rooms or prices.",
                    },
                    {
                        "role": "user",
                        "content": f"Hotel data:\n{context}\n\nUser message:\n{message}",
                    },
                ],
            )
            reply = response.output_text.strip()
            if reply:
                return {"reply": reply}
        except Exception:
            pass

    if any(word in lowercase for word in ["hello", "hi", "hey", "good morning", "good evening"]):
        return {"reply": "Hello! I can help you find a room, compare options, or explain the hotel amenities. What kind of stay are you planning?"}

    if any(word in lowercase for word in ["budget", "cheap", "low price", "affordable", "price"]):
        room = rooms[0] if rooms else None
        if room:
            return {
                "reply": f"The most budget-friendly option right now is Room {room['room_number']} ({room['room_type']}), priced at ${float(room['price_per_night']):.2f}/night with {room['capacity']} guest capacity."
            }
        return {"reply": "I currently do not have any room pricing information available."}

    if any(word in lowercase for word in ["suite", "recommend", "best room", "good room", "couple", "family"]):
        room = max(rooms, key=lambda x: float(x["price_per_night"])) if rooms else None
        if room:
            return {
                "reply": f"For a premium stay, I recommend Room {room['room_number']} ({room['room_type']}), which is {room['capacity']} guests and ${float(room['price_per_night']):.2f}/night. It is a strong option for comfort and space."
            }
        return {"reply": "I can suggest a room once the current inventory is loaded into the system."}

    if any(word in lowercase for word in ["available", "availability", "open room", "free room"]):
        stats = "\n".join(room_lines) if room_lines else "No rooms available."
        return {
            "reply": f"Here are the current room options:\n{stats}",
        }

    if any(
        word in lowercase
        for word in [
            "amenity",
            "facilities",
            "pool",
            "spa",
            "breakfast",
            "dining",
            "parking",
            "wifi",
            "internet",
            "gym",
            "balcony",
            "shuttle",
        ]
    ):
        return {
            "reply": f"Based on your question about {message.strip()}, the hotel currently offers a premium guest experience with room options and a range of amenities. Here are the current choices:\n{context}",
        }

    if any(word in lowercase for word in ["cancel", "cancellation", "cancelled", "cancel my booking", "cancel booking"]):
        return {
            "reply": "To cancel a booking, open the My bookings page, find the reservation you want to cancel, and click the Cancel button. Cancellations depend on the booking status and the hotel's policy."
        }

    if any(word in lowercase for word in ["booking", "book", "reserve", "stay"]):
        return {
            "reply": "You can browse available rooms from the home page and choose a room to complete your booking. If you want, I can also help shortlist the best rooms for your dates and guest count."
        }

    return {"reply": build_fallback_reply(message, room_lines)}


@app.post("/api/auth/register")
def register(payload: RegisterRequest, db=Depends(get_db)):
    email = payload.email.strip().lower()
    if not payload.full_name or not email or not payload.password:
        raise HTTPException(status_code=400, detail="full_name, email and password are required")

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cursor.fetchone():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    password_hash = bcrypt.hashpw(payload.password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    cursor.execute(
        "INSERT INTO users (full_name, email, password_hash, phone, role) VALUES (%s, %s, %s, %s, %s)",
        (payload.full_name, email, password_hash, payload.phone or None, "user"),
    )
    db.commit()

    user = {"id": cursor.lastrowid, "email": email, "role": "user", "full_name": payload.full_name}
    return {"token": sign_token(user), "user": user}


@app.post("/api/auth/login")
def login(payload: LoginRequest, db=Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user_row = cursor.fetchone()
    if not user_row:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    is_valid = bcrypt.checkpw(payload.password.encode("utf-8"), user_row["password_hash"].encode("utf-8"))
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user = {
        "id": user_row["id"],
        "email": user_row["email"],
        "role": user_row["role"],
        "full_name": user_row["full_name"],
    }
    return {"token": sign_token(user), "user": user}


@app.get("/api/auth/me")
def me(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, full_name, email, phone, role, created_at FROM users WHERE id = %s",
        (current_user["id"],),
    )
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/api/rooms")
def list_rooms(
    db=Depends(get_db),
    type: str | None = Query(default=None, alias="type"),
    min_price: str | None = Query(default=None, alias="min_price"),
    max_price: str | None = Query(default=None, alias="max_price"),
    check_in: str | None = Query(default=None, alias="check_in"),
    check_out: str | None = Query(default=None, alias="check_out"),
    status: str | None = Query(default=None, alias="status"),
):
    sql = "SELECT * FROM rooms WHERE 1=1"
    params: list[Any] = []

    if type:
        sql += " AND room_type = %s"
        params.append(type)
    if min_price:
        sql += " AND price_per_night >= %s"
        params.append(float(min_price))
    if max_price:
        sql += " AND price_per_night <= %s"
        params.append(float(max_price))
    if status:
        sql += " AND status = %s"
        params.append(status)
    if check_in and check_out:
        sql += " AND id NOT IN (SELECT room_id FROM bookings WHERE status IN ('confirmed','pending') AND NOT (check_out <= %s OR check_in >= %s))"
        params.extend([check_in, check_out])

    sql += " ORDER BY room_number ASC"
    cursor = db.cursor(dictionary=True)
    cursor.execute(sql, tuple(params))
    return cursor.fetchall()


@app.get("/api/rooms/{room_id}")
def get_room(room_id: int, db=Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rooms WHERE id = %s", (room_id,))
    room = cursor.fetchone()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@app.post("/api/rooms")
def create_room(payload: RoomPayload, user: dict = Depends(get_current_user), db=Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    if not payload.room_number or not payload.room_type or payload.price_per_night is None:
        raise HTTPException(status_code=400, detail="room_number, room_type and price_per_night are required")

    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "INSERT INTO rooms (room_number, room_type, price_per_night, capacity, description, amenities, image_url, status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)",
        (
            payload.room_number,
            payload.room_type,
            payload.price_per_night,
            payload.capacity or 2,
            payload.description or "",
            payload.amenities or "",
            payload.image_url or "",
            payload.status or "available",
        ),
    )
    db.commit()
    new_id = cursor.lastrowid
    cursor.execute("SELECT * FROM rooms WHERE id = %s", (new_id,))
    room = cursor.fetchone()
    return room


@app.put("/api/rooms/{room_id}")
def update_room(room_id: int, payload: RoomPayload, user: dict = Depends(get_current_user), db=Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    fields = {
        "room_number": payload.room_number,
        "room_type": payload.room_type,
        "price_per_night": payload.price_per_night,
        "capacity": payload.capacity,
        "description": payload.description,
        "amenities": payload.amenities,
        "image_url": payload.image_url,
        "status": payload.status,
    }
    updates = []
    params = []

    for field, value in fields.items():
        if value is not None:
            updates.append(f"{field} = %s")
            params.append(value)

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    params.append(room_id)
    cursor = db.cursor(dictionary=True)
    cursor.execute(f"UPDATE rooms SET {', '.join(updates)} WHERE id = %s", tuple(params))
    db.commit()
    cursor.execute("SELECT * FROM rooms WHERE id = %s", (room_id,))
    room = cursor.fetchone()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@app.delete("/api/rooms/{room_id}")
def delete_room(room_id: int, user: dict = Depends(get_current_user), db=Depends(get_db)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    cursor = db.cursor(dictionary=True)
    cursor.execute("DELETE FROM rooms WHERE id = %s", (room_id,))
    db.commit()
    return {"message": "Room deleted"}


@app.post("/api/bookings")
def create_booking(payload: BookingPayload, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    if not payload.room_id or not payload.check_in or not payload.check_out:
        raise HTTPException(status_code=400, detail="room_id, check_in and check_out are required")
    if datetime.strptime(payload.check_in, "%Y-%m-%d") >= datetime.strptime(payload.check_out, "%Y-%m-%d"):
        raise HTTPException(status_code=400, detail="check_out must be after check_in")

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM rooms WHERE id = %s", (payload.room_id,))
    room = cursor.fetchone()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    cursor.execute(
        "SELECT id FROM bookings WHERE room_id = %s AND status IN ('confirmed','pending') AND NOT (check_out <= %s OR check_in >= %s)",
        (payload.room_id, payload.check_in, payload.check_out),
    )
    if cursor.fetchone():
        raise HTTPException(status_code=409, detail="Room is not available for the selected dates")

    nights = max((datetime.strptime(payload.check_out, "%Y-%m-%d") - datetime.strptime(payload.check_in, "%Y-%m-%d")).days, 0)
    total_amount = float(room["price_per_night"]) * nights

    cursor.execute(
        "INSERT INTO bookings (user_id, room_id, check_in, check_out, guests, special_requests, total_amount, status) VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')",
        (
            current_user["id"],
            payload.room_id,
            payload.check_in,
            payload.check_out,
            payload.guests or 1,
            payload.special_requests or "",
            total_amount,
        ),
    )
    db.commit()
    booking_id = cursor.lastrowid
    cursor.execute(
        "SELECT b.*, r.room_number, r.room_type, r.image_url FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.id = %s",
        (booking_id,),
    )
    booking = cursor.fetchone()
    return booking


@app.get("/api/bookings/mine")
def my_bookings(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute(
        "SELECT b.*, r.room_number, r.room_type, r.image_url, r.price_per_night FROM bookings b JOIN rooms r ON r.id = b.room_id WHERE b.user_id = %s ORDER BY b.created_at DESC",
        (current_user["id"],),
    )
    return cursor.fetchall()


@app.patch("/api/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
    booking = cursor.fetchone()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if current_user.get("role") != "admin" and booking["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only cancel your own bookings")

    cursor.execute("UPDATE bookings SET status = 'cancelled' WHERE id = %s", (booking_id,))
    db.commit()
    return {"message": "Booking cancelled"}


@app.get("/api/bookings")
def list_all_bookings(
    status: str | None = Query(default=None),
    user: dict = Depends(require_admin),
    db=Depends(get_db),
):
    sql = "SELECT b.*, r.room_number, r.room_type, u.full_name, u.email FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN users u ON u.id = b.user_id WHERE 1=1"
    params = []
    if status:
        sql += " AND b.status = %s"
        params.append(status)
    sql += " ORDER BY b.created_at DESC"
    cursor = db.cursor(dictionary=True)
    cursor.execute(sql, tuple(params))
    return cursor.fetchall()


@app.patch("/api/bookings/{booking_id}/status")
def update_booking_status(
    booking_id: int,
    payload: BookingStatusUpdate,
    user: dict = Depends(require_admin),
    db=Depends(get_db),
):
    allowed = ["pending", "confirmed", "cancelled", "checked_in", "checked_out"]
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(allowed)}")

    cursor = db.cursor(dictionary=True)
    cursor.execute("UPDATE bookings SET status = %s WHERE id = %s", (payload.status, booking_id))
    db.commit()
    cursor.execute("SELECT * FROM bookings WHERE id = %s", (booking_id,))
    booking = cursor.fetchone()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


@app.get("/api/users")
def list_users(user: dict = Depends(require_admin), db=Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT id, full_name, email, phone, role, created_at FROM users ORDER BY created_at DESC")
    return cursor.fetchall()


@app.get("/api/users/dashboard-stats")
def dashboard_stats(user: dict = Depends(require_admin), db=Depends(get_db)):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT COUNT(*) AS total_rooms FROM rooms")
    total_rooms = cursor.fetchone()["total_rooms"]
    cursor.execute("SELECT COUNT(*) AS available_rooms FROM rooms WHERE status = 'available'")
    available_rooms = cursor.fetchone()["available_rooms"]
    cursor.execute("SELECT COUNT(*) AS total_bookings FROM bookings")
    total_bookings = cursor.fetchone()["total_bookings"]
    cursor.execute("SELECT COUNT(*) AS pending_bookings FROM bookings WHERE status = 'pending'")
    pending_bookings = cursor.fetchone()["pending_bookings"]
    cursor.execute("SELECT COUNT(*) AS total_users FROM users WHERE role = 'user'")
    total_users = cursor.fetchone()["total_users"]
    cursor.execute("SELECT COALESCE(SUM(total_amount),0) AS revenue FROM bookings WHERE status IN ('confirmed','checked_in','checked_out')")
    revenue = cursor.fetchone()["revenue"]
    return {"total_rooms": total_rooms, "available_rooms": available_rooms, "total_bookings": total_bookings, "pending_bookings": pending_bookings, "total_users": total_users, "revenue": float(revenue or 0)}


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    return {"detail": exc.detail}, exc.status_code


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)
