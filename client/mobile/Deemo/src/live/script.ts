import type { QuestionType } from "./types";

// Sample defense from the design prototype (ReqTrack). Mock engine only; the real
// panel's questions come from Gemini Live and the student's manuscript.

export const PRESENTATION =
  "Good evening, panel. Our study is ReqTrack, an enrollment requirements tracking system for PMFTCI. It replaces paper checklists with a mobile tracker the registrar updates in real time.";

export const CLOSING = "Thank you, that concludes our questions for today.";

type Item = {
  topicId: string;
  panelist: number;
  type: QuestionType;
  isFollowUp?: boolean;
  question: string;
  answer: string; // the simulated student's spoken answer
  flag?: { spokenClaim: string; manuscriptEvidence: string; severity: "LOW" | "MEDIUM" | "HIGH" };
};

export const SCRIPT: Item[] = [
  {
    topicId: "problem",
    panelist: 0,
    type: "CONCEPTUAL",
    question: "In one or two sentences, what problem does your system solve, and for whom?",
    answer: "Students line up at the registrar just to check a paper checklist. ReqTrack shows them what's missing on their phone.",
  },
  {
    topicId: "database",
    panelist: 1,
    type: "TECHNICAL",
    question: "Why did you choose Firebase over a relational database for the requirement records?",
    answer: "Because it syncs in real time, and we tested it with about fifty users during the pilot.",
    flag: {
      spokenClaim: "tested it with about fifty users",
      manuscriptEvidence: "thirty (30) respondents evaluated the system (Chapter 3)",
      severity: "HIGH",
    },
  },
  {
    topicId: "database",
    panelist: 1,
    type: "CLARIFICATORY",
    isFollowUp: true,
    question:
      "Earlier you said you tested it with about fifty users, but Chapter 3 reports thirty respondents for the ISO 25010 evaluation. Which number is correct, and if both are, can you explain how the two groups differ?",
    answer: "Thirty is correct. Fifty was the number of test accounts, but only thirty respondents completed the evaluation.",
  },
  {
    topicId: "security",
    panelist: 1,
    type: "SCENARIO",
    question: "Say a student's account password leaks. What stops someone from seeing or changing that student's requirement records?",
    answer: "Firebase Authentication guards sign-in, and our Firestore rules only let a student read their own records; only registrar accounts can write.",
  },
  {
    topicId: "evaluation",
    panelist: 2,
    type: "METHODOLOGICAL",
    question: "How did you compute the weighted mean for your ISO 25010 evaluation, and how did you interpret it?",
    answer:
      "We used a four-point Likert scale, took the weighted mean per characteristic, and interpreted it with the verbal scale in Table 7.",
  },
];
