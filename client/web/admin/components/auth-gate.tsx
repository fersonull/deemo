"use client"

import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"

import { Button } from "@/components/ui/button"
import { getAuth } from "@/lib/firebase"

type State =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "not-admin"; user: User }
  | { status: "admin"; user: User }

const AdminContext = createContext<User | null>(null)
export const useAdmin = () => useContext(AdminContext)!

// Only Firebase accounts with the `admin` custom claim get past this (set with server/scripts/set-admin.ts). The server
// checks the same claim on every request; this gate only decides what to show.
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" })
  const [error, setError] = useState("")

  const configured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY)

  useEffect(
    () =>
      configured
        ? onAuthStateChanged(getAuth(), async (user) => {
            if (!user) return setState({ status: "signed-out" })
            const { claims } = await user.getIdTokenResult()
            setState(
              claims.admin === true
                ? { status: "admin", user }
                : { status: "not-admin", user }
            )
          })
        : undefined,
    [configured]
  )

  const signIn = async () => {
    setError("")
    try {
      await signInWithPopup(getAuth(), new GoogleAuthProvider())
    } catch (e) {
      const code = (e as { code?: string }).code ?? ""
      if (!code.includes("popup-closed"))
        setError("Couldn't sign in. Try again.")
    }
  }

  if (!configured)
    return (
      <Centered>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Firebase isn&apos;t set up
        </h1>
        <p className="text-sm text-muted-foreground">
          Add the NEXT_PUBLIC_FIREBASE_* values from .env.example to .env.local
          (or the Vercel project&apos;s environment variables), then restart.
        </p>
      </Centered>
    )

  if (state.status === "loading")
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">Checking your sign-in…</p>
      </Centered>
    )

  if (state.status === "signed-out")
    return (
      <Centered>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          DEEMO admin
        </h1>
        <p className="text-sm text-muted-foreground">
          Sign in with the Google account that has admin access.
        </p>
        <Button onClick={signIn} className="mt-2">
          Sign in with Google
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </Centered>
    )

  if (state.status === "not-admin")
    return (
      <Centered>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Not an admin
        </h1>
        <p className="text-sm text-muted-foreground">
          {state.user.email} doesn&apos;t have admin access. If it was just
          granted, sign out and sign in again.
        </p>
        <Button
          variant="outline"
          onClick={() => signOut(getAuth())}
          className="mt-2"
        >
          Sign out
        </Button>
      </Centered>
    )

  return (
    <AdminContext.Provider value={state.user}>{children}</AdminContext.Provider>
  )
}

function Centered({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-2 text-center">
        {children}
      </div>
    </main>
  )
}
