FROM php:8.5-fpm

RUN apt-get update \
    && apt-get install -y \
        libpq-dev \
        libicu-dev \
        libzip-dev \
        libonig-dev \
        libxml2-dev \
        unzip \
        git \
    && docker-php-ext-install pdo_pgsql \
    && docker-php-ext-install mbstring \
    && docker-php-ext-install xml \
    && docker-php-ext-install bcmath \
    && docker-php-ext-install intl \
    && docker-php-ext-install zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html