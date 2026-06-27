CREATE TABLE inventory (
    sku VARCHAR(50) PRIMARY KEY,
    stock INTEGER NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE events (
    event_id VARCHAR(50) PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    user_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL, 
    processed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE oversell_incidents (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) NOT NULL,
    redis_stock INTEGER NOT NULL,
    detected_at TIMESTAMP DEFAULT NOW()
);