// Give (or take away) the web admin's `admin` claim: bun scripts/set-admin.ts <email> [--remove]
// The person signs out of the admin and back in afterwards, so their token carries the change.
import { getAuth } from "../src/shared/auth/firebase";

const [email, flag] = process.argv.slice(2);
if (!email) throw new Error("Usage: bun scripts/set-admin.ts <email> [--remove]");
const user = await getAuth().getUserByEmail(email);
const admin = flag !== "--remove";
await getAuth().setCustomUserClaims(user.uid, { ...user.customClaims, admin });
console.log(`${email} (${user.uid}): admin = ${admin}`);
process.exit(0);
