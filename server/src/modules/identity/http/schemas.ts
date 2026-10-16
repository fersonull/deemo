import { z } from "zod";

import { AVATAR } from "../domain/account";
import { COURSES } from "../domain/course";

// PATCH /me
export const MeUpdate = z
  .object({
    consentVersion: z.string().trim().min(1).max(20, "consentVersion is at most 20 characters."),
    premium: z.boolean(), // only true does anything (the simulated upgrade)
    allowTyping: z.boolean(),
    course: z.enum(COURSES, { error: "Pick your course from the list." }),
    avatar: z.string().regex(AVATAR, "That avatar isn't valid."),
    name: z.string().trim().min(1, "Enter your name.").max(60, "Keep your name under 60 characters.").transform((s) => s.replace(/\s+/g, " ")),
  })
  .partial();
