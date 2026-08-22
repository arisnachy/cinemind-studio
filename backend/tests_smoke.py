from app.schemas import GenerateTitleRequest, TasteProfile

def test_request_schema():
    req = GenerateTitleRequest(profile=TasteProfile(id="u", name="Viewer"))
    assert req.format == "series"
    assert 50 <= req.intensity <= 100
