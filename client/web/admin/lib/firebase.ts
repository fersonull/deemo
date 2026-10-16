import { getApps, initializeApp } from "firebase/app"
import { getAuth as firebaseAuth, type Auth } from "firebase/auth"

// The same Firebase project as the mobile app, through its Web app config. Sign-in only; data comes from the server.
// Started on first use in the browser, never while Next.js prerenders a page (no API key there).
let auth: Auth | null = null
export function getAuth() {
  auth ??= firebaseAuth(
    getApps()[0] ??
      initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      })
  )
  return auth
}
