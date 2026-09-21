from app.schemas import ExportRequest, SummaryStats, ImportResult


class TestExportAndSummarySchemas:
    def test_export_request_defaults(self):
        req = ExportRequest()
        assert req.status_filter is None
        assert req.search is None

    def test_export_request_custom(self):
        req = ExportRequest(status_filter="IP", search="TEST-PCID")
        assert req.status_filter == "IP"
        assert req.search == "TEST-PCID"

    def test_summary_stats(self):
        stats = SummaryStats(
            total_records=10,
            ip_count=4,
            completed_count=5,
            hold_count=1,
        )
        assert stats.total_records == 10
        assert stats.ip_count == 4
        assert stats.completed_count == 5
        assert stats.hold_count == 1

    def test_import_result(self):
        res = ImportResult(
            success=3,
            errors=[{"row": 2, "error": "test error"}],
            message="Imported",
        )
        assert res.success == 3
        assert len(res.errors) == 1
        assert res.message == "Imported"
