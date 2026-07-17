import pytest
from services.sentiment import analyze_sentiment

def test_analyze_sentiment_positive():
    headline = "Laba Bersih BBCA Melonjak Tinggi Di Kuartal I"
    res = analyze_sentiment(headline)
    assert res["label"] == "POSITIVE"
    assert res["ticker"] == "BBCA"
    assert res["score"] > 0

def test_analyze_sentiment_negative():
    headline = "ADRO Alami Penurunan Laba Bersih Akibat Rugi Operasional"
    res = analyze_sentiment(headline)
    assert res["label"] == "NEGATIVE"
    assert res["ticker"] == "ADRO"
    assert res["score"] < 0

def test_analyze_sentiment_neutral():
    headline = "Rencana Agenda RUPS PT GoTo Gojek Tokopedia"
    res = analyze_sentiment(headline)
    assert res["label"] == "NEUTRAL"
    assert res["ticker"] == "GOTO"
