-- MySQL initialization script
-- This runs on first container startup

-- Ensure utf8mb4
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Create database if not exists (handled by MYSQL_DATABASE env)
-- Additional setup can go here

-- Create test user for development (optional)
-- CREATE USER IF NOT EXISTS 'test_user'@'%' IDENTIFIED BY 'test_pass';
-- GRANT ALL PRIVILEGES ON rental_db.* TO 'test_user'@'%';
-- FLUSH PRIVILEGES;