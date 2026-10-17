/**
 * Dev-only login bypass guard: it must stay off unless every condition holds
 * (development build, explicit flag, demo storage mode, localhost).
 */
import { shouldBypassAuth } from "../src/lib/devAuthBypass";

function assert(condition: boolean, id: number, message: string) {
  if (!condition) {
    console.error(`❌ FAILED Test ${id}: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED Test ${id}: ${message}`);
}

const on = { nodeEnv: "development", bypassFlag: "true", demoFlag: "true", hostname: "localhost" };

assert(shouldBypassAuth(on) === true, 1, "All conditions met on localhost enables the bypass.");
assert(shouldBypassAuth({ ...on, hostname: "127.0.0.1" }) === true, 2, "127.0.0.1 counts as localhost.");
assert(shouldBypassAuth({ ...on, nodeEnv: "production" }) === false, 3, "Production build never bypasses.");
assert(shouldBypassAuth({ ...on, nodeEnv: "test" }) === false, 4, "Test environment never bypasses.");
assert(shouldBypassAuth({ ...on, bypassFlag: undefined }) === false, 5, "Missing bypass flag keeps sign-in.");
assert(shouldBypassAuth({ ...on, bypassFlag: "1" }) === false, 6, "Only the exact value 'true' enables the bypass.");
assert(shouldBypassAuth({ ...on, demoFlag: undefined }) === false, 7, "Without demo storage mode the production cache key is never used by the bypass.");
assert(shouldBypassAuth({ ...on, hostname: "bikevault.byzahr.app" }) === false, 8, "Deployed hostname never bypasses.");
assert(shouldBypassAuth({ ...on, hostname: "bikevault-git-develop.vercel.app" }) === false, 9, "Vercel preview never bypasses.");
assert(shouldBypassAuth({ ...on, hostname: "localhost.evil.com" }) === false, 10, "Hostnames merely containing localhost are rejected.");
assert(shouldBypassAuth({ ...on, hostname: undefined }) === false, 11, "Server-side render (no hostname) never bypasses.");

console.log("🎉 ALL 11 DEV AUTH BYPASS GUARD TESTS PASSED!");
