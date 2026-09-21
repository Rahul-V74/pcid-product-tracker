"""
Unit tests for schemas (validation logic — no DB required).
"""
import pytest
from pydantic import ValidationError
from app.schemas import PCIDRecordCreate, PCIDRecordUpdate, UserCreate


class TestPCIDRecordCreate:
    def test_valid_record(self):
        r = PCIDRecordCreate(
            customer_id="CUST001",
            pcid="PCID-XYZ",
            designer_name="Alice",
            status="IP",
        )
        assert r.customer_id == "CUST001"
        assert r.status == "IP"

    def test_default_status_is_ip(self):
        r = PCIDRecordCreate(
            customer_id="C1", pcid="P1", designer_name="Bob"
        )
        assert r.status == "IP"

    @pytest.mark.parametrize("status", ["IP", "Completed", "HOLD"])
    def test_all_valid_statuses(self, status):
        r = PCIDRecordCreate(
            customer_id="C1", pcid="P1", designer_name="Bob", status=status
        )
        assert r.status == status

    def test_invalid_status_raises(self):
        with pytest.raises(ValidationError):
            PCIDRecordCreate(
                customer_id="C1", pcid="P1", designer_name="Bob", status="INVALID"
            )

    def test_missing_required_fields_raise(self):
        with pytest.raises(ValidationError):
            PCIDRecordCreate(pcid="P1", designer_name="Bob")  # missing customer_id

    def test_optional_fields_default_to_none(self):
        r = PCIDRecordCreate(customer_id="C1", pcid="P1", designer_name="Bob")
        assert r.delivery_date is None
        assert r.remarks is None


class TestPCIDRecordUpdate:
    def test_all_fields_optional(self):
        # Should not raise — all fields are optional
        r = PCIDRecordUpdate()
        assert r.customer_id is None

    def test_partial_update(self):
        r = PCIDRecordUpdate(status="Completed")
        assert r.status == "Completed"
        assert r.customer_id is None

    def test_invalid_status_raises(self):
        with pytest.raises(ValidationError):
            PCIDRecordUpdate(status="UNKNOWN")

    def test_none_status_is_allowed(self):
        r = PCIDRecordUpdate(status=None)
        assert r.status is None


class TestUserCreate:
    def test_valid_user(self):
        u = UserCreate(email="user@example.com", password="secret123")
        assert u.email == "user@example.com"

    def test_invalid_email_raises(self):
        with pytest.raises(ValidationError):
            UserCreate(email="not-an-email", password="pass")

    def test_full_name_optional(self):
        u = UserCreate(email="a@b.com", password="pass")
        assert u.full_name is None
