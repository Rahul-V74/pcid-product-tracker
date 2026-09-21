"""
Unit tests for security module (no DB required).
"""
from app.core.security import get_password_hash, verify_password, create_access_token, decode_token


def test_password_hash_and_verify():
    password = "supersecret123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed)


def test_wrong_password_fails():
    hashed = get_password_hash("correct_password")
    assert not verify_password("wrong_password", hashed)


def test_password_hash_is_different_each_time():
    h1 = get_password_hash("same_password")
    h2 = get_password_hash("same_password")
    # bcrypt uses random salt — each hash should be unique
    assert h1 != h2


def test_password_72_byte_limit():
    # bcrypt silently truncates at 72 bytes; both should verify
    long_pw = "a" * 100
    hashed = get_password_hash(long_pw)
    assert verify_password(long_pw, hashed)
    # A password with same first 72 chars also verifies (bcrypt behaviour)
    assert verify_password("a" * 72, hashed)


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token({"sub": "test@example.com"})
        assert isinstance(token, str)
        payload = decode_token(token)
        assert payload is not None
        assert payload["sub"] == "test@example.com"

    def test_invalid_token_returns_none(self):
        assert decode_token("not.a.valid.token") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token({"sub": "test@example.com"})
        tampered = token[:-5] + "XXXXX"
        assert decode_token(tampered) is None

    def test_token_contains_exp(self):
        token = create_access_token({"sub": "user@test.com"})
        payload = decode_token(token)
        assert "exp" in payload
