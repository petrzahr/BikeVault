import { pgTable, uuid, varchar, text, integer, numeric, boolean, date, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. KATEGORIE KOMPONENTŮ
export const componentCategories = pgTable("component_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  nameCs: varchar("name_cs", { length: 100 }).notNull(),
  nameEn: varchar("name_en", { length: 100 }).notNull(),
  defaultSlot: varchar("default_slot", { length: 50 }),
  isSystem: boolean("is_system").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. KOLO (BIKE)
export const bikes = pgTable("bikes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 150 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  modelYear: integer("model_year"),
  category: varchar("category", { length: 50 }).notNull(),
  discipline: varchar("discipline", { length: 50 }).notNull(),
  suspensionType: varchar("suspension_type", { length: 50 }).notNull(),
  driveType: varchar("drive_type", { length: 50 }).default("CONVENTIONAL").notNull(),
  serialNumber: varchar("serial_number", { length: 100 }),
  purchaseDate: date("purchase_date").notNull(),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("CZK").notNull(),
  status: varchar("status", { length: 30 }).default("ACTIVE").notNull(), // ACTIVE, INACTIVE, SOLD, ARCHIVED
  soldDate: date("sold_date"),
  soldPrice: numeric("sold_price", { precision: 12, scale: 2 }),
  currentKm: numeric("current_km", { precision: 10, scale: 1 }).default("0.0").notNull(),
  currentMinutes: integer("current_minutes").default(0).notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. ZÁZNAMY POČÍTADLA (ODOMETER ENTRIES)
export const bikeOdometerEntries = pgTable("bike_odometer_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id, { onDelete: "cascade" }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  entryDate: date("entry_date").notNull(),
  entryType: varchar("entry_type", { length: 30 }).notNull(), // RIDE, CORRECTION, INITIAL
  deltaKm: numeric("delta_km", { precision: 10, scale: 1 }).default("0.0").notNull(),
  deltaMinutes: integer("delta_minutes").default(0).notNull(),
  resultingKm: numeric("resulting_km", { precision: 10, scale: 1 }).notNull(),
  resultingMinutes: integer("resulting_minutes").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_odometer_bike_date").on(table.bikeId, table.recordedAt),
]);

// 4. FYZICKÝ KOMPONENT
export const components = pgTable("components", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id").references(() => componentCategories.id).notNull(),
  manufacturer: varchar("manufacturer", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  variant: varchar("variant", { length: 100 }),
  serialNumber: varchar("serial_number", { length: 100 }),
  initialKm: numeric("initial_km", { precision: 10, scale: 1 }).default("0.0").notNull(),
  initialMinutes: integer("initial_minutes").default(0).notNull(),
  purchaseDate: date("purchase_date"),
  purchasePrice: numeric("purchase_price", { precision: 12, scale: 2 }).default("0.00"),
  currency: varchar("currency", { length: 3 }).default("CZK").notNull(),
  warrantyUntil: date("warranty_until"),
  status: varchar("status", { length: 30 }).default("IN_STORAGE").notNull(), // INSTALLED, IN_STORAGE, SOLD, DAMAGED, DISCARDED
  soldDate: date("sold_date"),
  soldPrice: numeric("sold_price", { precision: 12, scale: 2 }),
  wheelDiameter: varchar("wheel_diameter", { length: 20 }),
  tireWidth: varchar("tire_width", { length: 20 }),
  tireCasing: varchar("tire_casing", { length: 50 }),
  tireCompound: varchar("tire_compound", { length: 50 }),
  isTubeless: boolean("is_tubeless").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_components_category").on(table.categoryId),
  index("idx_components_status").on(table.status),
]);

// 5. HISTORIE MONTÁŽÍ (COMPONENT INSTALLATIONS)
export const componentInstallations = pgTable("component_installations", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id).notNull(),
  componentId: uuid("component_id").references(() => components.id).notNull(),
  slot: varchar("slot", { length: 50 }).notNull(),
  installedAt: timestamp("installed_at", { withTimezone: true }).defaultNow().notNull(),
  installedBikeKm: numeric("installed_bike_km", { precision: 10, scale: 1 }).notNull(),
  installedBikeMinutes: integer("installed_bike_minutes").notNull(),
  removedAt: timestamp("removed_at", { withTimezone: true }),
  removedBikeKm: numeric("removed_bike_km", { precision: 10, scale: 1 }),
  removedBikeMinutes: integer("removed_bike_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_unique_active_component_installation").on(table.componentId).where(sql`removed_at IS NULL`),
  uniqueIndex("idx_unique_active_bike_slot").on(table.bikeId, table.slot).where(sql`removed_at IS NULL`),
  index("idx_installations_bike").on(table.bikeId, table.installedAt),
  index("idx_installations_component").on(table.componentId, table.installedAt),
]);

// 6. NASTAVENÍ KOLA (BIKE SETUP)
export const bikeSetups = pgTable("bike_setups", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id, { onDelete: "cascade" }).unique().notNull(),
  forkInstallationId: uuid("fork_installation_id").references(() => componentInstallations.id, { onDelete: "set null" }),
  shockInstallationId: uuid("shock_installation_id").references(() => componentInstallations.id, { onDelete: "set null" }),
  frontTireInstallationId: uuid("front_tire_installation_id").references(() => componentInstallations.id, { onDelete: "set null" }),
  rearTireInstallationId: uuid("rear_tire_installation_id").references(() => componentInstallations.id, { onDelete: "set null" }),
  // Vidlice
  forkPressurePsi: numeric("fork_pressure_psi", { precision: 5, scale: 1 }),
  forkSagPercent: integer("fork_sag_percent"),
  forkReboundClicks: integer("fork_rebound_clicks"),
  forkLscClicks: integer("fork_lsc_clicks"),
  forkHscClicks: integer("fork_hsc_clicks"),
  forkLsrClicks: integer("fork_lsr_clicks"),
  forkHsrClicks: integer("fork_hsr_clicks"),
  forkVolumeSpacers: integer("fork_volume_spacers"),
  forkTravelMm: integer("fork_travel_mm"),
  forkNotes: text("fork_notes"),
  // Tlumič
  shockPressurePsi: numeric("shock_pressure_psi", { precision: 5, scale: 1 }),
  shockSagPercent: integer("shock_sag_percent"),
  shockReboundClicks: integer("shock_rebound_clicks"),
  shockLscClicks: integer("shock_lsc_clicks"),
  shockHscClicks: integer("shock_hsc_clicks"),
  shockLsrClicks: integer("shock_lsr_clicks"),
  shockHsrClicks: integer("shock_hsr_clicks"),
  shockVolumeSpacers: integer("shock_volume_spacers"),
  shockNotes: text("shock_notes"),
  // Pláště
  frontTirePressureBar: numeric("front_tire_pressure_bar", { precision: 4, scale: 2 }),
  frontTireInsert: varchar("front_tire_insert", { length: 100 }),
  frontTireNotes: text("front_tire_notes"),
  rearTirePressureBar: numeric("rear_tire_pressure_bar", { precision: 4, scale: 2 }),
  rearTireInsert: varchar("rear_tire_insert", { length: 100 }),
  rearTireNotes: text("rear_tire_notes"),
  // Poznámky
  generalNotes: text("general_notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 7. SNÍMKY NASTAVENÍ (SETUP SNAPSHOTS)
export const setupSnapshots = pgTable("setup_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id, { onDelete: "cascade" }).notNull(),
  profileName: varchar("profile_name", { length: 100 }),
  snapshotData: jsonb("snapshot_data").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_snapshots_bike").on(table.bikeId, table.createdAt),
]);

// 8. SERVISNÍ PLÁNY (SERVICE SCHEDULES)
export const serviceSchedules = pgTable("service_schedules", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").references(() => components.id, { onDelete: "cascade" }),
  componentCategoryId: uuid("component_category_id").references(() => componentCategories.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 150 }).notNull(),
  intervalKm: numeric("interval_km", { precision: 10, scale: 1 }),
  intervalHours: numeric("interval_hours", { precision: 8, scale: 2 }),
  intervalMonths: integer("interval_months"),
  conditionType: varchar("condition_type", { length: 20 }).default("WHICHEVER_FIRST").notNull(),
  warningThresholdHours: numeric("warning_threshold_hours", { precision: 8, scale: 2 }),
  warningThresholdKm: numeric("warning_threshold_km", { precision: 10, scale: 1 }),
  notes: text("notes"),
  lastServiceDate: date("last_service_date"),
  lastServiceBikeKm: numeric("last_service_bike_km", { precision: 10, scale: 1 }),
  lastServiceBikeHours: numeric("last_service_bike_hours", { precision: 8, scale: 2 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 9. SERVISNÍ UDÁLOSTI (SERVICE EVENTS)
export const serviceEvents = pgTable("service_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id).notNull(),
  componentId: uuid("component_id").references(() => components.id, { onDelete: "set null" }),
  serviceScheduleId: uuid("service_schedule_id").references(() => serviceSchedules.id, { onDelete: "set null" }),
  name: varchar("name", { length: 150 }).notNull(),
  serviceDate: date("service_date").notNull(),
  bikeKm: numeric("bike_km", { precision: 10, scale: 1 }).notNull(),
  bikeMinutes: integer("bike_minutes").notNull(),
  executionType: varchar("execution_type", { length: 30 }).notNull(), // DIY, WORKSHOP
  serviceProvider: varchar("service_provider", { length: 150 }),
  partsCost: numeric("parts_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  laborCost: numeric("labor_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  otherCost: numeric("other_cost", { precision: 12, scale: 2 }).default("0.00").notNull(),
  currency: varchar("currency", { length: 3 }).default("CZK").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_service_events_bike").on(table.bikeId, table.serviceDate),
  index("idx_service_events_component").on(table.componentId, table.serviceDate),
]);

// 10. FINANČNÍ TRANSAKCE (FINANCIAL TRANSACTIONS) - JEDINÝ ZDROJ PRAVDY
export const financialTransactions = pgTable("financial_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id),
  componentId: uuid("component_id").references(() => components.id, { onDelete: "set null" }),
  serviceEventId: uuid("service_event_id").references(() => serviceEvents.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 20 }).notNull(), // EXPENSE, INCOME
  category: varchar("category", { length: 50 }).notNull(), // BIKE_PURCHASE, COMPONENT_PURCHASE, SERVICE_LABOR, SERVICE_PARTS, CONSUMABLES, ACCESSORIES, BIKE_SALE, COMPONENT_SALE, REFUND, OTHER
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("CZK").notNull(),
  transactionDate: date("transaction_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("idx_transactions_bike").on(table.bikeId, table.transactionDate),
  index("idx_transactions_component").on(table.componentId),
]);

// 11. PŘÍLOHY (ATTACHMENTS)
export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  bikeId: uuid("bike_id").references(() => bikes.id, { onDelete: "cascade" }),
  componentId: uuid("component_id").references(() => components.id, { onDelete: "cascade" }),
  serviceEventId: uuid("service_event_id").references(() => serviceEvents.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  fileSizeBytes: integer("file_size_bytes").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
