from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import requests
from datetime import datetime, timedelta
from collections import defaultdict

app = FastAPI(title="Stok Tahmin Servisi")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKEND_URL = "http://localhost:5041/api"

def get_stock_movements(company_id: str, token: str):
    """Backend'den stok hareketlerini çeker, encoding sorununu düzeltir."""
    headers = {"Authorization": f"Bearer {token}"}
    since = (datetime.utcnow() - timedelta(days=30)).isoformat()
    url = f"{BACKEND_URL}/stockmovements/history?companyId={company_id}&since={since}"
    resp = requests.get(url, headers=headers)
    resp.encoding = 'utf-8'          # 🆕 Türkçe karakter / encoding sorununu çözer
    resp.raise_for_status()
    return resp.json()

@app.get("/predict")
def predict_stock(
    company_id: str = Query("11111111-1111-1111-1111-111111111111"),
    token: str = Query(...),
    days: int = Query(7),
    threshold_days: int = Query(3)
):
    """
    Her ürün için günlük ortalama çıkış miktarını hesaplar,
    mevcut stokla birlikte kaç gün yeterli olduğunu tahmin eder.
    """
    try:
        raw_data = get_stock_movements(company_id, token)
    except Exception as e:
        return {"error": f"Backend verisi alınamadı: {str(e)}"}

    daily_out = defaultdict(lambda: defaultdict(int))
    current_stock = defaultdict(int)

    for move in raw_data.get("data", []):
        pid = move["productId"]
        qty = move["quantity"]
        mtype = move["type"]
        date_str = move["date"][:10]

        if mtype == "OUT":
            daily_out[pid][date_str] += qty
            current_stock[pid] -= qty
        elif mtype == "IN":
            current_stock[pid] += qty

    results = []
    for pid, daily in daily_out.items():
        sorted_dates = sorted(daily.keys())[-days:]
        if not sorted_dates:
            continue
        total_out = sum(daily[d] for d in sorted_dates)
        avg_daily = total_out / len(sorted_dates)

        stock_now = max(0, current_stock.get(pid, 0))
        days_left = round(stock_now / avg_daily, 1) if avg_daily > 0 else float('inf')
        warning = days_left <= threshold_days

        results.append({
            "productId": pid,
            "avgDailyOut": round(avg_daily, 2),
            "currentStock": stock_now,
            "estimatedDaysLeft": days_left,
            "warning": warning
        })

    return {"predictions": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)