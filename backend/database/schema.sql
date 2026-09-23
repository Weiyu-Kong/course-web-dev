-- Core data model from the course ER diagram:
-- Traveler 1 ---- * Booking * ---- 1 Train

CREATE DATABASE IF NOT EXISTS railway_demo
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE railway_demo;

CREATE TABLE IF NOT EXISTS Traveler (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  username VARCHAR(32) NOT NULL,
  email VARCHAR(254) NOT NULL,
  nationality VARCHAR(60) NOT NULL,
  birth_date DATE NOT NULL,
  gender ENUM('Male', 'Female') NOT NULL,
  passport_no VARCHAR(30) NOT NULL,
  passport_expiration_date DATE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_traveler_username (username),
  UNIQUE KEY uq_traveler_email (email),
  UNIQUE KEY uq_traveler_passport (passport_no)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Train (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  train_number VARCHAR(12) NOT NULL,
  service_date DATE NOT NULL,
  origin VARCHAR(60) NOT NULL,
  destination VARCHAR(60) NOT NULL,
  departure_location VARCHAR(100) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_location VARCHAR(100) NOT NULL,
  arrival_time TIME NOT NULL,
  duration_minutes SMALLINT UNSIGNED NOT NULL,
  is_bookable BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_train_service (train_number, service_date),
  KEY idx_train_search (origin, destination, service_date, is_bookable)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Booking (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_no VARCHAR(24) NOT NULL,
  passenger_id BIGINT UNSIGNED NOT NULL,
  train_id BIGINT UNSIGNED NOT NULL,
  ticket_class ENUM('standing ticket', 'Second Class', 'First Class', 'Business Class') NOT NULL,
  ticket_type ENUM('Adult', 'Child', 'Student') NOT NULL,
  passenger_name VARCHAR(100) NOT NULL,
  passenger_id_no VARCHAR(30) NOT NULL,
  passenger_nationality VARCHAR(60) NOT NULL,
  idempotency_key CHAR(36) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_booking_no (booking_no),
  UNIQUE KEY uq_booking_idempotency (passenger_id, idempotency_key),
  KEY idx_booking_passenger (passenger_id),
  KEY idx_booking_train (train_id),
  CONSTRAINT fk_booking_traveler
    FOREIGN KEY (passenger_id) REFERENCES Traveler(id) ON DELETE RESTRICT,
  CONSTRAINT fk_booking_train
    FOREIGN KEY (train_id) REFERENCES Train(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- TravelerSession is infrastructure for login persistence, not a core ER entity.
CREATE TABLE IF NOT EXISTS TravelerSession (
  token_hash CHAR(64) NOT NULL,
  traveler_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_session_traveler (traveler_id),
  KEY idx_session_expiration (expires_at),
  CONSTRAINT fk_traveler_session_traveler
    FOREIGN KEY (traveler_id) REFERENCES Traveler(id) ON DELETE CASCADE
) ENGINE=InnoDB;
