# Guide for ssl apache2 server in docker from here:
# https://medium.com/@tshenolomos/secure-apache-with-ssl-in-docker-9efd86329129

FROM php:7.4-apache

ENV DEBIAN_FRONTEND noninteractive
ENV PYTHONUNBUFFERED=1

MAINTAINER lmk

ARG HOSTNAME
ARG DB_NAME
ARG DB_USER
ARG DB_PASS
ARG DB_DIR
ARG DB_HOST

ENV HOSTNAME=$HOSTNAME
ENV DB_NAME=$DB_NAME
ENV DB_USER=$DB_USER
ENV DB_PASS=$DB_PASS
ENV DB_DIR=$DB_DIR
ENV DB_HOST=$DB_HOST

RUN apt-get -y update && \
    apt-get -y upgrade && \
    apt-get install -y vim && \
    rm -rf /var/lib/apt/lists/*

#RUN docker-php-ext-install mysqli
#RUN apt-get install -y libpng-dev && docker-php-ext-install pdo pdo_mysql gd

#RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/overwatch.key -out /etc/ssl/certs/overwatch.crt -subj "/C=UK/ST=England/L=Bristol/O=ParkSystems/CN=${OW_APACHE_IP}"

COPY apache/build/certs/overwatch.key /etc/ssl/private/overwatch.key
COPY apache/build/certs/overwatch.crt /etc/ssl/certs/overwatch.crt
COPY apache/build/overwatch.conf /etc/apache2/sites-available/overwatch.conf

RUN a2enmod ssl && \
    a2enmod rewrite && \
    a2dissite 000-default default-ssl && \
    a2ensite overwatch

