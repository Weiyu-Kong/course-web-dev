-- Railway ticket demo schema
-- Run with: npm run db:init

CREATE DATABASE IF NOT EXISTS railway_demo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE railway_demo;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nationality VARCHAR(60) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  passport_number VARCHAR(30) NOT NULL,
  passport_expiration_date DATE NOT NULL,
  date_of_birth DATE NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  username VARCHAR(32) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_passport (passport_number)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_user_id (user_id),
  KEY idx_sessions_expires_at (expires_at),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS trains (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  train_number VARCHAR(12) NOT NULL,
  origin_city VARCHAR(60) NOT NULL,
  destination_city VARCHAR(60) NOT NULL,
  departure_station VARCHAR(100) NOT NULL,
  arrival_station VARCHAR(100) NOT NULL,
  travel_date DATE NOT NULL,
  display_date VARCHAR(40) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  is_bookable BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_train_service (train_number, travel_date),
  KEY idx_train_search (origin_city, destination_city, display_date, is_bookable)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_number VARCHAR(24) NOT NULL,
  idempotency_key CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  train_id BIGINT UNSIGNED NOT NULL,
  passenger_name VARCHAR(100) NOT NULL,
  passenger_id_number VARCHAR(30) NOT NULL,
  passenger_nationality VARCHAR(60) NOT NULL,
  ticket_class ENUM('standing ticket', 'Second Class', 'First Class', 'Business Class') NOT NULL,
  ticket_type ENUM('Adult', 'Child', 'Student') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_number (booking_number),
  UNIQUE KEY uq_booking_idempotency (user_id, idempotency_key),
  KEY idx_bookings_user (user_id),
  CONSTRAINT fk_bookings_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_train
    FOREIGN KEY (train_id) REFERENCES trains(id) ON DELETE RESTRICT
) ENGINE=InnoDB;
