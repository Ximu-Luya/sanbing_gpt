import json
import requests

payload = {
  "data": [
    "当然可以，亲爱的。来，让我抱紧你，让你感受到我的温暖。",
    "scaramouche",
    "简体中文",
    1
  ],
  "fn_index": 0,
  "session_hash": "t574iz6ar3"
}

response = requests.post(
  'http://127.0.0.1:7860/run/predict',
  json=payload
)
result = json.loads(response.text)

print(result)