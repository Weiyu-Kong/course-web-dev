USE railway_demo;

INSERT INTO Train (
  train_number, service_date, origin, destination,
  departure_location, departure_time,
  arrival_location, arrival_time,
  duration_minutes, is_bookable
) VALUES
  ('G532', '2026-05-31', 'Shanghai', 'Beijing',
   'ShanghaiHongqiao', '06:31:00', 'BeijingNan', '12:18:00', 347, TRUE),
  ('G561', '2026-05-31', 'Beijing', 'Tianjin',
   'BeijingNan', '18:08:00', 'TianjinXi', '18:43:00', 35, TRUE)
ON DUPLICATE KEY UPDATE
  origin = VALUES(origin),
  destination = VALUES(destination),
  departure_location = VALUES(departure_location),
  departure_time = VALUES(departure_time),
  arrival_location = VALUES(arrival_location),
  arrival_time = VALUES(arrival_time),
  duration_minutes = VALUES(duration_minutes),
  is_bookable = VALUES(is_bookable);
