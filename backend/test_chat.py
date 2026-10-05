import sys
import types
import unittest

sys.modules.setdefault("openai", types.SimpleNamespace(OpenAI=None))

from main import chat
from pydantic import BaseModel


class ChatRequest(BaseModel):
    message: str


class FakeCursor:
    def __init__(self, rows):
        self._rows = rows

    def execute(self, *args, **kwargs):
        pass

    def fetchall(self):
        return self._rows


class FakeDB:
    def __init__(self, rows):
        self._rows = rows

    def cursor(self, dictionary=True):
        return FakeCursor(self._rows)


class ChatBehaviorTests(unittest.TestCase):
    def setUp(self):
        self.rooms = [
            {
                "room_number": "101",
                "room_type": "Deluxe",
                "price_per_night": 140.0,
                "capacity": 2,
                "status": "available",
            },
            {
                "room_number": "205",
                "room_type": "Suite",
                "price_per_night": 220.0,
                "capacity": 4,
                "status": "available",
            },
        ]

    def test_unrecognized_questions_are_not_repeated_as_generic_answers(self):
        response = chat(ChatRequest(message="Do you have parking nearby?"), db=FakeDB(self.rooms))

        self.assertIn("parking", response["reply"].lower())
        self.assertNotIn("I can help with hotel room options", response["reply"])

    def test_greeting_still_returns_a_concise_welcome(self):
        response = chat(ChatRequest(message="hello there"), db=FakeDB(self.rooms))

        self.assertIn("hello", response["reply"].lower())

    def test_booking_cancellation_question_has_specific_instructions(self):
        response = chat(ChatRequest(message="how can i cancel my booking?"), db=FakeDB(self.rooms))

        self.assertIn("my bookings", response["reply"].lower())
        self.assertIn("cancel", response["reply"].lower())


if __name__ == "__main__":
    unittest.main()
