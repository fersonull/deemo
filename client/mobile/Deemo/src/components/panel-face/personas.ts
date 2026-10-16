import { colors, panelist } from "@/theme";

// The three panelists as flat busts (style: round flat avatars, no outlines). Parts are data; one renderer draws all.
export type Persona = {
  circle: string; // background disc
  skin: string;
  skinShade: string; // neck, ears, nose
  hair: string;
  hairStyle: "bun" | "sidePart" | "short";
  glasses: boolean;
  beard: boolean;
  top: { cloth: string; inner: string; style: "blazer" | "polo" | "cardigan" };
};

export const PERSONAS: Persona[] = [
  // Dr. Reyes, Chair: senior, glasses, hair in a bun, blazer.
  {
    circle: panelist.chair,
    skin: colors.skinLight,
    skinShade: colors.skinLightShade,
    hair: colors.hairGray,
    hairStyle: "bun",
    glasses: true,
    beard: false,
    top: { cloth: colors.duskInk, inner: colors.paper, style: "blazer" },
  },
  // Engr. Santos, Technical: young, short side-part hair, polo.
  {
    circle: panelist.technical,
    skin: colors.skinMid,
    skinShade: colors.skinMidShade,
    hair: colors.hairBlack,
    hairStyle: "sidePart",
    glasses: false,
    beard: false,
    top: { cloth: colors.sageInk, inner: colors.sageTint, style: "polo" },
  },
  // Prof. Cruz, Methodology: beard, cardigan over a shirt.
  {
    circle: panelist.methodology,
    skin: colors.skinDeep,
    skinShade: colors.skinDeepShade,
    hair: colors.hairBrown,
    hairStyle: "short",
    glasses: false,
    beard: true,
    top: { cloth: colors.amberInk, inner: colors.duskTint, style: "cardigan" },
  },
];
