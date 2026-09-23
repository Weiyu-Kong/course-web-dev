USE railway_demo;

INSERT INTO trains (
  train_number, origin_city, destination_city,
  departure_station, arrival_station, travel_date, display_date,
  departure_time, arrival_time, duration_minutes, is_bookable
) VALUES
  ('G532', 'Shanghai', 'Beijing', 'ShanghaiHongqiao', 'BeijingNan',
   '2026-05-31', 'Sun, May 31', '06:31:00', '12:18:00', 347, TRUE),
  ('G561', 'Beijing', 'Tianjin', 'BeijingNan', 'TianjinXi',
   '2026-05-31', 'Sun, May 31', '18:08:00', '18:43:00', 35, TRUE)
ON DUPLICATE KEY UPDATE
  origin_city = VALUES(origin_city),
  destination_city = VALUES(destination_city),
  departure_station = VALUES(departure_station),
  arrival_station = VALUES(arrival_station),
  display_date = VALUES(display_date),
  departure_time = VALUES(departure_time),
  arrival_time = VALUES(arrival_time),
  duration_minutes = VALUES(duration_minutes),
  is_bookable = VALUES(is_bookable);
