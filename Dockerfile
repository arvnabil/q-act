FROM php:8.3-cli-alpine

RUN apk add --no-cache \
    mysql-client \
    libpng-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    zip \
    unzip \
    && docker-php-ext-install pdo pdo_mysql

WORKDIR /var/www/html

COPY . /var/www/html

CMD ["php", "artisan", "queue:work", "--tries=3", "--timeout=90"]
