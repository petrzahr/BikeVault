import { db, schema } from "./index";
import { initDatabase } from "./init";
import { sql, eq } from "drizzle-orm";

export async function seedDemoData() {
  await initDatabase();

  // Check if bikes already seeded
  const existingBikes = await db.select().from(schema.bikes);
  if (existingBikes.length > 0) {
    console.log("Databáze již obsahuje data. Přeskakuji seed.");
    return;
  }

  console.log("Seeding demo dat pro BikeVault (Propain Spindrift CF & Canyon Grizl)...");

  // Fetch categories
  const categories = await db.select().from(schema.componentCategories);
  const catMap = new Map(categories.map((c) => [c.code, c.id]));

  // 1. VYTVOŘENÍ KOLA 1: Propain Spindrift CF
  const [propain] = await db.insert(schema.bikes).values({
    name: "Propain Spindrift CF",
    manufacturer: "Propain",
    model: "Spindrift CF",
    modelYear: 2024,
    category: "MTB",
    discipline: "ENDURO",
    suspensionType: "FULL_SUSPENSION",
    driveType: "CONVENTIONAL",
    serialNumber: "PROP-SPIN-2024-8841",
    purchaseDate: "2024-03-15",
    purchasePrice: "145000.00",
    currency: "CZK",
    status: "ACTIVE",
    currentKm: "2847.0",
    currentMinutes: 11160, // 186 h
    imageUrl: "https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?auto=format&fit=crop&w=1200&q=80",
    notes: "Zakázková stavba z Německa. Využití: bikeparky, enduro závody a těžké traily.",
  }).returning();

  // Finanční transakce: Nákup kola
  await db.insert(schema.financialTransactions).values({
    bikeId: propain.id,
    type: "EXPENSE",
    category: "BIKE_PURCHASE",
    amount: "145000.00",
    currency: "CZK",
    transactionDate: "2024-03-15",
    notes: "Nákup kompletního rámu a základní sestavy Propain",
  });

  // Odometer záznamy pro Propain
  await db.insert(schema.bikeOdometerEntries).values([
    {
      bikeId: propain.id,
      entryDate: "2024-03-16",
      entryType: "INITIAL",
      deltaKm: "0.0",
      deltaMinutes: 0,
      resultingKm: "0.0",
      resultingMinutes: 0,
      note: "Nově složené kolo",
    },
    {
      bikeId: propain.id,
      entryDate: "2026-09-08",
      entryType: "SNAPSHOT",
      deltaKm: "347.0",
      deltaMinutes: 960,
      resultingKm: "2847.0",
      resultingMinutes: 11160,
      note: "Pravidelný odečet po sezóně bikeparků",
    }
  ]);

  // 2. VYTVOŘENÍ KOLA 2: Canyon Grizl CF SL (Gravel)
  const [canyon] = await db.insert(schema.bikes).values({
    name: "Canyon Grizl CF SL",
    manufacturer: "Canyon",
    model: "Grizl CF SL 8",
    modelYear: 2023,
    category: "GRAVEL",
    discipline: "GRAVEL",
    suspensionType: "RIGID",
    driveType: "CONVENTIONAL",
    serialNumber: "CAN-GRIZ-2023-1102",
    purchaseDate: "2023-05-10",
    purchasePrice: "68000.00",
    currency: "CZK",
    status: "ACTIVE",
    currentKm: "4320.0",
    currentMinutes: 11880, // 198 h
    imageUrl: "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80",
    notes: "Štěrkolet na celodenní expedice a rychlé švihy po zpevněných cestách.",
  }).returning();

  await db.insert(schema.financialTransactions).values({
    bikeId: canyon.id,
    type: "EXPENSE",
    category: "BIKE_PURCHASE",
    amount: "68000.00",
    currency: "CZK",
    transactionDate: "2023-05-10",
    notes: "Nákup kola Canyon Grizl z oficiálního e-shopu",
  });

  // Odometer záznamy pro Canyon Grizl
  await db.insert(schema.bikeOdometerEntries).values([
    {
      bikeId: canyon.id,
      entryDate: "2023-05-10",
      entryType: "INITIAL",
      deltaKm: "0.0",
      deltaMinutes: 0,
      resultingKm: "0.0",
      resultingMinutes: 0,
      note: "Počáteční stav nového kola",
    },
    {
      bikeId: canyon.id,
      entryDate: "2024-09-01",
      entryType: "SNAPSHOT",
      deltaKm: "4320.0",
      deltaMinutes: 11880,
      resultingKm: "4320.0",
      resultingMinutes: 11880,
      note: "Pravidelný odečet před podzimním servisem",
    }
  ]);

  // 3. KOMPONENTY PRO PROPAIN SPINDRIFT
  const forkCatId = catMap.get("FORK")!;
  const shockCatId = catMap.get("REAR_SHOCK")!;
  const tireFrontCatId = catMap.get("TIRE_FRONT")!;
  const tireRearCatId = catMap.get("TIRE_REAR")!;
  const pedalsCatId = catMap.get("PEDALS")!;
  const chainCatId = catMap.get("CHAIN")!;
  const brakesCatId = catMap.get("BRAKES")!;
  const wheelsCatId = catMap.get("WHEELS")!;

  // Vidlice ZEB Ultimate
  const [fork] = await db.insert(schema.components).values({
    categoryId: forkCatId,
    manufacturer: "RockShox",
    model: "ZEB Ultimate Charger 3.1 RC2",
    variant: "Slab Grey 180mm 29\"",
    serialNumber: "RS-ZEB-2024-9912",
    purchaseDate: "2024-05-02",
    purchasePrice: "24900.00",
    currency: "CZK",
    status: "INSTALLED",
    notes: "Upgrade z původní vidlice ZEB Select.",
  }).returning();

  const [forkInstall] = await db.insert(schema.componentInstallations).values({
    bikeId: propain.id,
    componentId: fork.id,
    slot: "FORK",
    installedAt: new Date("2024-05-03"),
    installedBikeKm: "840.0",
    installedBikeMinutes: 3200,
  }).returning();

  // Tlumič Super Deluxe Ultimate
  const [shock] = await db.insert(schema.components).values({
    categoryId: shockCatId,
    manufacturer: "RockShox",
    model: "Super Deluxe Ultimate RC2T",
    variant: "Air 205x65 Trunnion",
    serialNumber: "RS-SD-2024-4411",
    purchaseDate: "2024-03-15",
    purchasePrice: "15500.00",
    currency: "CZK",
    status: "INSTALLED",
    notes: "Hydraulic Bottom Out, lineární vzduchová komora.",
  }).returning();

  const [shockInstall] = await db.insert(schema.componentInstallations).values({
    bikeId: propain.id,
    componentId: shock.id,
    slot: "REAR_SHOCK",
    installedAt: new Date("2024-03-15"),
    installedBikeKm: "0.0",
    installedBikeMinutes: 0,
  }).returning();

  // Přední plášť Maxxis Assegai
  const [frontTire] = await db.insert(schema.components).values({
    categoryId: tireFrontCatId,
    manufacturer: "Maxxis",
    model: "Assegai",
    variant: "3C MaxxGrip DoubleDown TR",
    wheelDiameter: "29\"",
    tireWidth: "2.5\"",
    tireCasing: "DoubleDown (DD)",
    tireCompound: "3C MaxxGrip",
    purchaseDate: "2024-06-10",
    purchasePrice: "1890.00",
    currency: "CZK",
    status: "INSTALLED",
  }).returning();

  const [frontTireInstall] = await db.insert(schema.componentInstallations).values({
    bikeId: propain.id,
    componentId: frontTire.id,
    slot: "FRONT_TIRE",
    installedAt: new Date("2024-06-10"),
    installedBikeKm: "1200.0",
    installedBikeMinutes: 4600,
  }).returning();

  // Zadní plášť Maxxis Minion DHR II
  const [rearTire] = await db.insert(schema.components).values({
    categoryId: tireRearCatId,
    manufacturer: "Maxxis",
    model: "Minion DHR II",
    variant: "3C MaxxGrip Downhill TR",
    wheelDiameter: "29\"",
    tireWidth: "2.4\"",
    tireCasing: "Downhill (DH)",
    tireCompound: "3C MaxxGrip",
    purchaseDate: "2024-07-01",
    purchasePrice: "1990.00",
    currency: "CZK",
    status: "INSTALLED",
  }).returning();

  const [rearTireInstall] = await db.insert(schema.componentInstallations).values({
    bikeId: propain.id,
    componentId: rearTire.id,
    slot: "REAR_TIRE",
    installedAt: new Date("2024-07-01"),
    installedBikeKm: "1600.0",
    installedBikeMinutes: 6200,
  }).returning();

  // Pedály OneUp (HISTORIE PŘESUNU: dříve na Gravelu, nyní na Enduru!)
  const [pedals] = await db.insert(schema.components).values({
    categoryId: pedalsCatId,
    manufacturer: "OneUp Components",
    model: "Aluminum Pedals",
    variant: "Black",
    purchaseDate: "2023-06-01",
    purchasePrice: "3490.00",
    currency: "CZK",
    status: "INSTALLED",
    notes: "Původně ježděny na Canyon Grizl (3 840 km), poté přesunuty na Propain.",
  }).returning();

  // Historická uzavřená montáž na Gravelu
  await db.insert(schema.componentInstallations).values({
    bikeId: canyon.id,
    componentId: pedals.id,
    slot: "PEDALS",
    installedAt: new Date("2023-06-01"),
    installedBikeKm: "100.0",
    installedBikeMinutes: 280,
    removedAt: new Date("2024-08-01"),
    removedBikeKm: "3940.0",
    removedBikeMinutes: 10800,
  });

  // Současná aktivní montáž na Propainu
  await db.insert(schema.componentInstallations).values({
    bikeId: propain.id,
    componentId: pedals.id,
    slot: "PEDALS",
    installedAt: new Date("2024-08-05"),
    installedBikeKm: "2367.0",
    installedBikeMinutes: 9280,
  });

  // Řetěz SRAM XX Transmission (po termínu výměny!)
  const [chain] = await db.insert(schema.components).values({
    categoryId: chainCatId,
    manufacturer: "SRAM",
    model: "XX Eagle Transmission Flattop",
    purchaseDate: "2024-03-15",
    purchasePrice: "3200.00",
    currency: "CZK",
    status: "INSTALLED",
  }).returning();

  await db.insert(schema.componentInstallations).values({
    bikeId: propain.id,
    componentId: chain.id,
    slot: "CHAIN",
    installedAt: new Date("2024-03-15"),
    installedBikeKm: "0.0",
    installedBikeMinutes: 0,
  });

  // 4. BIKE SETUP PRO PROPAIN SPINDRIFT
  await db.insert(schema.bikeSetups).values({
    bikeId: propain.id,
    forkInstallationId: forkInstall.id,
    shockInstallationId: shockInstall.id,
    frontTireInstallationId: frontTireInstall.id,
    rearTireInstallationId: rearTireInstall.id,
    // Vidlice
    forkPressurePsi: "76.0",
    forkSagPercent: 20,
    forkReboundClicks: 7, // 7 kliků od zavřené polohy
    forkLscClicks: 4,     // 4 kliky od zavřené polohy
    forkHscClicks: 2,     // 2 kliky od zavřené polohy
    forkVolumeSpacers: 1,
    forkTravelMm: 180,
    forkNotes: "Základní tlak pro váhu 82 kg s výstrojí. ButterCups tlumí vibrace.",
    // Tlumič
    shockPressurePsi: "195.0",
    shockSagPercent: 28,
    shockReboundClicks: 6,
    shockLscClicks: 3,
    shockHscClicks: 2,
    shockVolumeSpacers: 1,
    shockNotes: "Progresivní přepákování Spindriftu sedí s 28% SAGem.",
    // Pláště
    frontTirePressureBar: "1.55",
    frontTireInsert: "Bez vložky",
    frontTireNotes: "DD kostra, bez vložky, suchý bikepark",
    rearTirePressureBar: "1.75",
    rearTireInsert: "CushCore Pro",
    rearTireNotes: "DH kostra, CushCore Pro",
    // Obecná poznámka
    generalNotes: "Bikepark – sucho, rychlé a rozbité tratě. DD vpředu, DH vzadu, CushCore vzadu. Tlumič o 2 kliky pomalejší rebound než běžný trail setup.",
  });

  // Uložení profilu SetupSnapshot
  await db.insert(schema.setupSnapshots).values({
    bikeId: propain.id,
    profileName: "Bikepark – sucho",
    snapshotData: {
      fork: { model: "ZEB Ultimate", pressurePsi: 76, rebound: 7, lsc: 4, hsc: 2 },
      shock: { model: "Super Deluxe", pressurePsi: 195, sag: 28, rebound: 6 },
      frontTire: { model: "Assegai 2.5", pressureBar: 1.55, note: "DD kostra, sucho" },
      rearTire: { model: "Minion DHR 2.4", pressureBar: 1.75, note: "DH + CushCore Pro" },
      generalNotes: "Bikepark – sucho, rychlé rozbité tratě.",
    },
    notes: "Základní osvědčené nastavení na Špičák a Klínovec.",
  });

  // 5. SERVISNÍ PLÁNY A ZÁZNAMY
  // Plán 1: Servis spodních nohou vidlice (50 h) -> Zbývá 7 h (BRZY SERVIS)
  const [schedFork] = await db.insert(schema.serviceSchedules).values({
    bikeId: propain.id,
    componentId: fork.id,
    name: "Servis spodních nohou vidlice",
    intervalHours: "50.0",
    conditionType: "WHICHEVER_FIRST",
    lastServiceDate: "2024-07-20",
    lastServiceBikeKm: "2100.0",
    lastServiceBikeHours: "143.0", // 186 - 143 = 43h odjetých -> zbývá 7 h!
    isActive: true,
  }).returning();

  // Plán 2: Kompletní servis tlumiče (200 h) -> Zbývá 32 h
  await db.insert(schema.serviceSchedules).values({
    bikeId: propain.id,
    componentId: shock.id,
    name: "Kompletní servis tlumiče (200 h)",
    intervalHours: "200.0",
    conditionType: "WHICHEVER_FIRST",
    lastServiceDate: "2024-03-15",
    lastServiceBikeKm: "0.0",
    lastServiceBikeHours: "0.0", // 186h odjeto -> zbývá 14h do 200h
    isActive: true,
  });

  // Plán 3: Výměna řetězu (1 500 km) -> PO TERMÍNU o 143 km!
  await db.insert(schema.serviceSchedules).values({
    bikeId: propain.id,
    componentId: chain.id,
    name: "Výměna řetězu Eagle Transmission",
    intervalKm: "1500.0",
    conditionType: "WHICHEVER_FIRST",
    lastServiceDate: "2024-05-15",
    lastServiceBikeKm: "1204.0", // 2847 - 1204 = 1643 km -> 143 km po termínu!
    lastServiceBikeHours: "78.0",
    isActive: true,
  });

  // Provedený historický servis
  const [servEvent] = await db.insert(schema.serviceEvents).values({
    bikeId: propain.id,
    componentId: fork.id,
    serviceScheduleId: schedFork.id,
    name: "Servis spodních nohou vidlice",
    serviceDate: "2024-07-20",
    bikeKm: "2100.0",
    bikeMinutes: 8580, // 143 h
    executionType: "DIY",
    serviceProvider: "Svépomocí",
    partsCost: "690.00",
    laborCost: "0.00",
    otherCost: "0.00",
    currency: "CZK",
    notes: "Výměna gufer SKF a molitanových kroužků, nový olej Maxima Plush Dynamic 4wt.",
  }).returning();

  await db.insert(schema.financialTransactions).values({
    bikeId: propain.id,
    componentId: fork.id,
    serviceEventId: servEvent.id,
    type: "EXPENSE",
    category: "SERVICE_PARTS",
    amount: "690.00",
    currency: "CZK",
    transactionDate: "2024-07-20",
    notes: "Sada těsnění a olej na vidlici",
  });

  console.log("✅ Demo data úspěšně založena!");
}
