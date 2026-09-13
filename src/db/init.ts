import { db, getClient } from "./index";
import { sql } from "drizzle-orm";

export async function initDatabase() {
  const client = getClient();

  // Execute multi-statement DDL via client.exec()
  await client.exec(`
    CREATE TABLE IF NOT EXISTS component_categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      name_cs VARCHAR(100) NOT NULL,
      name_en VARCHAR(100) NOT NULL,
      default_slot VARCHAR(50),
      is_system BOOLEAN DEFAULT TRUE NOT NULL,
      sort_order INT DEFAULT 0 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bikes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(150) NOT NULL,
      manufacturer VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      model_year INT,
      category VARCHAR(50) NOT NULL,
      discipline VARCHAR(50) NOT NULL,
      suspension_type VARCHAR(50) NOT NULL,
      drive_type VARCHAR(50) DEFAULT 'CONVENTIONAL' NOT NULL,
      serial_number VARCHAR(100),
      purchase_date DATE NOT NULL,
      purchase_price NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      currency VARCHAR(3) DEFAULT 'CZK' NOT NULL,
      status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL,
      sold_date DATE,
      sold_price NUMERIC(12, 2),
      current_km NUMERIC(10, 1) DEFAULT 0.0 NOT NULL,
      current_minutes INT DEFAULT 0 NOT NULL,
      image_url VARCHAR(500),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bike_odometer_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
      recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      entry_date DATE NOT NULL,
      entry_type VARCHAR(30) NOT NULL,
      delta_km NUMERIC(10, 1) DEFAULT 0.0 NOT NULL,
      delta_minutes INT DEFAULT 0 NOT NULL,
      resulting_km NUMERIC(10, 1) NOT NULL,
      resulting_minutes INT NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS components (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id UUID NOT NULL REFERENCES component_categories(id) ON DELETE RESTRICT,
      manufacturer VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      variant VARCHAR(100),
      serial_number VARCHAR(100),
      initial_km NUMERIC(10, 1) DEFAULT 0.0 NOT NULL,
      initial_minutes INT DEFAULT 0 NOT NULL,
      purchase_date DATE,
      purchase_price NUMERIC(12, 2) DEFAULT 0.00,
      currency VARCHAR(3) DEFAULT 'CZK' NOT NULL,
      warranty_until DATE,
      status VARCHAR(30) DEFAULT 'IN_STORAGE' NOT NULL,
      sold_date DATE,
      sold_price NUMERIC(12, 2),
      wheel_diameter VARCHAR(20),
      tire_width VARCHAR(20),
      tire_casing VARCHAR(50),
      tire_compound VARCHAR(50),
      is_tubeless BOOLEAN DEFAULT TRUE,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS component_installations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID NOT NULL REFERENCES bikes(id) ON DELETE RESTRICT,
      component_id UUID NOT NULL REFERENCES components(id) ON DELETE RESTRICT,
      slot VARCHAR(50) NOT NULL,
      installed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      installed_bike_km NUMERIC(10, 1) NOT NULL,
      installed_bike_minutes INT NOT NULL,
      removed_at TIMESTAMPTZ,
      removed_bike_km NUMERIC(10, 1),
      removed_bike_minutes INT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bike_setups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID UNIQUE NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
      fork_installation_id UUID REFERENCES component_installations(id) ON DELETE SET NULL,
      shock_installation_id UUID REFERENCES component_installations(id) ON DELETE SET NULL,
      front_tire_installation_id UUID REFERENCES component_installations(id) ON DELETE SET NULL,
      rear_tire_installation_id UUID REFERENCES component_installations(id) ON DELETE SET NULL,
      fork_pressure_psi NUMERIC(5, 1),
      fork_sag_percent INT,
      fork_rebound_clicks INT,
      fork_lsc_clicks INT,
      fork_hsc_clicks INT,
      fork_lsr_clicks INT,
      fork_hsr_clicks INT,
      fork_volume_spacers INT,
      fork_travel_mm INT,
      fork_notes TEXT,
      shock_pressure_psi NUMERIC(5, 1),
      shock_sag_percent INT,
      shock_rebound_clicks INT,
      shock_lsc_clicks INT,
      shock_hsc_clicks INT,
      shock_lsr_clicks INT,
      shock_hsr_clicks INT,
      shock_volume_spacers INT,
      shock_notes TEXT,
      front_tire_pressure_bar NUMERIC(4, 2),
      front_tire_insert VARCHAR(100),
      front_tire_notes TEXT,
      rear_tire_pressure_bar NUMERIC(4, 2),
      rear_tire_insert VARCHAR(100),
      rear_tire_notes TEXT,
      general_notes TEXT,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS setup_snapshots (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID NOT NULL REFERENCES bikes(id) ON DELETE CASCADE,
      profile_name VARCHAR(100),
      snapshot_data JSONB NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS service_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID REFERENCES bikes(id) ON DELETE CASCADE,
      component_id UUID REFERENCES components(id) ON DELETE CASCADE,
      component_category_id UUID REFERENCES component_categories(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      interval_km NUMERIC(10, 1),
      interval_hours NUMERIC(8, 2),
      interval_months INT,
      condition_type VARCHAR(20) DEFAULT 'WHICHEVER_FIRST' NOT NULL,
      warning_threshold_hours NUMERIC(8, 2),
      warning_threshold_km NUMERIC(10, 1),
      notes TEXT,
      last_service_date DATE,
      last_service_bike_km NUMERIC(10, 1),
      last_service_bike_hours NUMERIC(8, 2),
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- Safe idempotent column additions for existing databases
    ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS warning_threshold_hours NUMERIC(8, 2);
    ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS warning_threshold_km NUMERIC(10, 1);
    ALTER TABLE service_schedules ADD COLUMN IF NOT EXISTS notes TEXT;

    CREATE TABLE IF NOT EXISTS service_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID NOT NULL REFERENCES bikes(id) ON DELETE RESTRICT,
      component_id UUID REFERENCES components(id) ON DELETE SET NULL,
      service_schedule_id UUID REFERENCES service_schedules(id) ON DELETE SET NULL,
      name VARCHAR(150) NOT NULL,
      service_date DATE NOT NULL,
      bike_km NUMERIC(10, 1) NOT NULL,
      bike_minutes INT NOT NULL,
      execution_type VARCHAR(30) NOT NULL,
      service_provider VARCHAR(150),
      parts_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      labor_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      other_cost NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
      currency VARCHAR(3) DEFAULT 'CZK' NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID REFERENCES bikes(id),
      component_id UUID REFERENCES components(id) ON DELETE SET NULL,
      service_event_id UUID REFERENCES service_events(id) ON DELETE CASCADE,
      type VARCHAR(20) NOT NULL,
      category VARCHAR(50) NOT NULL,
      amount NUMERIC(12, 2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'CZK' NOT NULL,
      transaction_date DATE NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      bike_id UUID REFERENCES bikes(id) ON DELETE CASCADE,
      component_id UUID REFERENCES components(id) ON DELETE CASCADE,
      service_event_id UUID REFERENCES service_events(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(500) NOT NULL,
      file_size_bytes INT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `);

  // Seed default component categories if empty
  const countRes = await db.execute(sql`SELECT count(*) as cnt FROM component_categories`);
  const count = Number((countRes.rows[0] as any)?.cnt || 0);

  if (count === 0) {
    const defaultCategories = [
      { code: "FRAME", nameCs: "Rám", nameEn: "Frame", defaultSlot: "FRAME", sortOrder: 1 },
      { code: "FORK", nameCs: "Vidlice", nameEn: "Fork", defaultSlot: "FORK", sortOrder: 2 },
      { code: "REAR_SHOCK", nameCs: "Tlumič", nameEn: "Rear Shock", defaultSlot: "REAR_SHOCK", sortOrder: 3 },
      { code: "CRANKSET", nameCs: "Kliky", nameEn: "Crankset", defaultSlot: "CRANKSET", sortOrder: 4 },
      { code: "BOTTOM_BRACKET", nameCs: "Středové složení", nameEn: "Bottom Bracket", defaultSlot: "BOTTOM_BRACKET", sortOrder: 5 },
      { code: "REAR_DERAILLEUR", nameCs: "Přehazovačka", nameEn: "Rear Derailleur", defaultSlot: "REAR_DERAILLEUR", sortOrder: 6 },
      { code: "CASSETTE", nameCs: "Kazeta", nameEn: "Cassette", defaultSlot: "CASSETTE", sortOrder: 7 },
      { code: "CHAIN", nameCs: "Řetěz", nameEn: "Chain", defaultSlot: "CHAIN", sortOrder: 8 },
      { code: "SHIFTER", nameCs: "Řazení", nameEn: "Shifter", defaultSlot: "SHIFTER", sortOrder: 9 },
      { code: "BRAKES", nameCs: "Brzdy", nameEn: "Brakes", defaultSlot: "BRAKES", sortOrder: 10 },
      { code: "BRAKE_ROTORS", nameCs: "Brzdové kotouče", nameEn: "Brake Rotors", defaultSlot: "BRAKE_ROTORS", sortOrder: 11 },
      { code: "BRAKE_PADS", nameCs: "Brzdové destičky", nameEn: "Brake Pads", defaultSlot: "BRAKE_PADS", sortOrder: 12 },
      { code: "WHEELS", nameCs: "Kola / Výplety", nameEn: "Wheels", defaultSlot: "WHEELS", sortOrder: 13 },
      { code: "TIRE_FRONT", nameCs: "Přední plášť", nameEn: "Front Tire", defaultSlot: "FRONT_TIRE", sortOrder: 14 },
      { code: "TIRE_REAR", nameCs: "Zadní plášť", nameEn: "Rear Tire", defaultSlot: "REAR_TIRE", sortOrder: 15 },
      { code: "HANDLEBAR", nameCs: "Řídítka", nameEn: "Handlebar", defaultSlot: "HANDLEBAR", sortOrder: 16 },
      { code: "STEM", nameCs: "Představec", nameEn: "Stem", defaultSlot: "STEM", sortOrder: 17 },
      { code: "HEADSET", nameCs: "Hlavové složení", nameEn: "Headset", defaultSlot: "HEADSET", sortOrder: 18 },
      { code: "SEATPOST", nameCs: "Sedlovka", nameEn: "Seatpost", defaultSlot: "SEATPOST", sortOrder: 19 },
      { code: "SADDLE", nameCs: "Sedlo", nameEn: "Saddle", defaultSlot: "SADDLE", sortOrder: 20 },
      { code: "PEDALS", nameCs: "Pedály", nameEn: "Pedals", defaultSlot: "PEDALS", sortOrder: 21 },
      { code: "OTHER", nameCs: "Ostatní", nameEn: "Other", defaultSlot: "OTHER", sortOrder: 99 },
    ];

    for (const cat of defaultCategories) {
      await db.execute(sql`
        INSERT INTO component_categories (code, name_cs, name_en, default_slot, sort_order)
        VALUES (${cat.code}, ${cat.nameCs}, ${cat.nameEn}, ${cat.defaultSlot}, ${cat.sortOrder})
      `);
    }
  }
}
