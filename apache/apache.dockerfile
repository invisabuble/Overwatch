# Author : Luke Park

FROM php:7.4-apache

ENV DEBIAN_FRONTEND noninteractive
ENV PYTHONUNBUFFERED=1

MAINTAINER lmk

ARG HOSTNAME

ENV HOSTNAME=$HOSTNAME

RUN apt-get -y update && \
    apt-get -y upgrade && \
    apt-get install -y vim && \
    rm -rf /var/lib/apt/lists/*

COPY apache/build/certs/overwatch.key /etc/ssl/private/overwatch.key
COPY apache/build/certs/overwatch.crt /etc/ssl/certs/overwatch.crt
COPY apache/build/overwatch.conf /etc/apache2/sites-available/overwatch.conf

RUN a2enmod ssl && \
    a2enmod rewrite && \
    a2dissite 000-default default-ssl && \
    a2ensite overwatch

