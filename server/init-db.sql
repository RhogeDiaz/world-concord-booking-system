-- Local development schema for the booking app.
-- If the database already exists, recreate the container with the volume removed to apply changes.

CREATE TABLE IF NOT EXISTS shippers (
  id SERIAL PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  company_name VARCHAR NOT NULL,
  company_address VARCHAR,
  company_phone VARCHAR,
  company_email VARCHAR,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_code VARCHAR,
  verification_expires TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pending_registrations (
  id SERIAL PRIMARY KEY,
  username VARCHAR UNIQUE NOT NULL,
  email VARCHAR,
  password VARCHAR NOT NULL,
  company_name VARCHAR NOT NULL,
  company_address VARCHAR,
  company_phone VARCHAR,
  company_email VARCHAR,
  verification_code VARCHAR NOT NULL,
  verification_expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ports (
  id SERIAL PRIMARY KEY,
  port_name VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS status (
  id SERIAL PRIMARY KEY,
  status_label VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS type_of_goods (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  shipper INTEGER REFERENCES shippers(id),
  destination_port INTEGER REFERENCES ports(id),
  departure_port INTEGER REFERENCES ports(id),
  transport_number VARCHAR,
  mbl_number VARCHAR,
  fsl_type VARCHAR,
  container_20 INTEGER,
  container_40 INTEGER,
  type_of_goods_id INTEGER REFERENCES type_of_goods(id),
  actual_time_departure TIMESTAMP,
  pickup_location VARCHAR,
  dropoff_location VARCHAR,
  pickup_date DATE,
  book_date TIMESTAMP DEFAULT NOW(),
  status_id INTEGER REFERENCES status(id),
  amount NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS billings (
  id SERIAL PRIMARY KEY,
  shipper INTEGER REFERENCES shippers(id),
  shipment INTEGER REFERENCES shipments(id),
  billing_type VARCHAR NOT NULL,
  amounts_payable NUMERIC NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'PHP'
);

-- Seed lookup values and a sample verified shipper
INSERT INTO ports (port_name) VALUES ('Sasa Wharf (Sasa Davao)') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('Makar Wharf (Gensan)') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('Davao-Manila') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('Rotterdam, Netherlands') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('Shanghai, China') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('Vancouver, Canada') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('Tianjin, China') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('New York, USA') ON CONFLICT DO NOTHING;
INSERT INTO ports (port_name) VALUES ('Sydney, Australia') ON CONFLICT DO NOTHING;

INSERT INTO status (status_label) VALUES ('Pending') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Confirmed') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Declined') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Picked Up') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Arrived in Port') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Departed') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Dropped Off') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Completed') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Rescheduled') ON CONFLICT DO NOTHING;
INSERT INTO status (status_label) VALUES ('Schedule Updated') ON CONFLICT DO NOTHING;

INSERT INTO type_of_goods (name) VALUES ('Perishable') ON CONFLICT DO NOTHING;
INSERT INTO type_of_goods (name) VALUES ('Non-Perishable') ON CONFLICT DO NOTHING;


INSERT INTO shippers (username, password, company_name, company_address, company_phone, company_email, is_admin, is_verified)
VALUES (
  'user@example.com',
  '$2b$10$NzJtf8kBypuPuaQ0aD66JuchCuBZlhdsdZ625xDt0sSx5Dgcs81.q',
  'Acme Shipping',
  '123 Example St',
  '09171234567',
  'user@example.com',
  FALSE,
  TRUE
)
ON CONFLICT (username) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  company_address = EXCLUDED.company_address,
  company_phone = EXCLUDED.company_phone,
  company_email = EXCLUDED.company_email,
  is_admin = EXCLUDED.is_admin,
  is_verified = EXCLUDED.is_verified;

INSERT INTO shipments (shipper, destination_port, departure_port, transport_number, mbl_number, fsl_type, container_20, container_40, type_of_goods_id, pickup_location, dropoff_location, pickup_date, actual_time_departure, book_date, status_id, amount)
VALUES
  (1, 2, 1, 'TR-1001', 'MBL-001', 'FCL', 1, 0, 1, 'Warehouse A', 'Port B', '2026-05-25', '2026-05-25 14:00:00', NOW(), 1, 1500.00),
  (1, 3, 2, 'TR-1002', 'MBL-002', 'LCL', 0, 2, 2, 'Warehouse B', 'Port C', '2026-06-05', '2026-06-05 08:30:00', NOW(), 2, 2400.50)
ON CONFLICT DO NOTHING;

INSERT INTO billings (shipper, shipment, billing_type, amounts_payable, currency)
VALUES
  (1, 1, 'TO_SHIPPER', 1500.00, 'PHP'),
  (1, 2, 'FROM_FSL', 2400.50, 'PHP')
ON CONFLICT DO NOTHING;
