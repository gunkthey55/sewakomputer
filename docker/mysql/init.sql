-- Init script for MySQL
-- Creates database and user if not exists

CREATE DATABASE IF NOT EXISTS `rental_system` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'rental_user'@'%' IDENTIFIED BY 'rental_pass';
GRANT ALL PRIVILEGES ON `rental_system`.* TO 'rental_user'@'%';
FLUSH PRIVILEGES;