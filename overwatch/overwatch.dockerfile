# Author : Luke Park

FROM python:3.9-slim

ARG WSS_HOST
ARG WSS_PORT
ARG PING_INT
ARG PING_TMT

ENV WSS_HOST=$WSS_HOST
ENV WSS_PORT=$WSS_PORT
ENV PING_INT=$PING_INT
ENV PING_TMT=$PING_TMT

WORKDIR /app
COPY overwatch/run/. /app

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "wss.py"]
