import { seedDemoData } from "../src/db/seed";

async function main() {
  console.log("Spouštím seed demo dat do lokálního PGlite...");
  await seedDemoData();
  console.log("Hotovo!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Chyba při seedování:", err);
  process.exit(1);
});
