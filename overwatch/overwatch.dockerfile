# Author : Luke Park

FROM python:3.9-slim

WORKDIR /app
COPY overwatch/run/. /app

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "wss.py"]
