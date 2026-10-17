import {
  FileTextIcon,
  GaugeIcon,
  MicIcon,
  ScrollTextIcon,
  ShieldIcon,
  UsersIcon,
  UsersRoundIcon,
  MegaphoneIcon,
} from "lucide-react"

// The admin's sections, in sidebar order. `key` is the second key of its "G then …" shortcut.
export const NAV = [
  { href: "/overview", label: "Overview", icon: GaugeIcon, key: "o" },
  { href: "/users", label: "Users", icon: UsersIcon, key: "u" },
  { href: "/sessions", label: "Sessions", icon: MicIcon, key: "s" },
  { href: "/projects", label: "Manuscripts", icon: FileTextIcon, key: "p" },
  { href: "/groups", label: "Groups", icon: UsersRoundIcon, key: "g" },
  { href: "/notices", label: "Notices", icon: MegaphoneIcon, key: "n" },
  { href: "/admins", label: "Admins", icon: ShieldIcon, key: "a" },
  { href: "/audit", label: "Audit log", icon: ScrollTextIcon, key: "l" },
] as const
