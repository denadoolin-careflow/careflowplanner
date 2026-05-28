import walking from "@/assets/movement/walking.png";
import stretching from "@/assets/movement/stretching.png";
import yinYoga from "@/assets/movement/yin-yoga.png";
import breathwork from "@/assets/movement/breathwork.png";
import dance from "@/assets/movement/dance.png";
import strength from "@/assets/movement/strength.png";
import catCow from "@/assets/movement/cat-cow.png";
import sunSalutation from "@/assets/movement/sun-salutation.png";
import childPose from "@/assets/movement/child-pose.png";
import sphinx from "@/assets/movement/sphinx.png";
import forwardFold from "@/assets/movement/forward-fold.png";
import legsUpWall from "@/assets/movement/legs-up-wall.png";
import savasana from "@/assets/movement/savasana.png";
import twist from "@/assets/movement/twist.png";
import neckShoulder from "@/assets/movement/neck-shoulder.png";
import jumpingJacks from "@/assets/movement/jumping-jacks.png";
import eyeReset from "@/assets/movement/eye-reset.png";
import meditation from "@/assets/movement/meditation.png";
import fallback from "@/assets/movement/default.png";

export type MovementVisualKey =
  | "walking" | "stretching" | "yin-yoga" | "breathwork" | "dance" | "strength"
  | "cat-cow" | "sun-salutation" | "child-pose" | "sphinx" | "forward-fold"
  | "legs-up-wall" | "savasana" | "twist" | "neck-shoulder" | "jumping-jacks"
  | "eye-reset" | "meditation" | "default";

export const MOVEMENT_VISUALS: Record<MovementVisualKey, string> = {
  walking, stretching,
  "yin-yoga": yinYoga,
  breathwork, dance, strength,
  "cat-cow": catCow,
  "sun-salutation": sunSalutation,
  "child-pose": childPose,
  sphinx,
  "forward-fold": forwardFold,
  "legs-up-wall": legsUpWall,
  savasana, twist,
  "neck-shoulder": neckShoulder,
  "jumping-jacks": jumpingJacks,
  "eye-reset": eyeReset,
  meditation,
  default: fallback,
};

/** Ordered keyword → visual key matches. First match wins. */
const KEYWORD_MAP: [RegExp, MovementVisualKey][] = [
  [/cat[- ]?cow/i, "cat-cow"],
  [/sun salutation|sun salut/i, "sun-salutation"],
  [/child.?s? pose|child pose/i, "child-pose"],
  [/sphinx/i, "sphinx"],
  [/legs? up.*wall/i, "legs-up-wall"],
  [/savasana|corpse pose/i, "savasana"],
  [/twist/i, "twist"],
  [/forward fold|forward bend/i, "forward-fold"],
  [/jumping jack/i, "jumping-jacks"],
  [/eye (reset|rest|relax)/i, "eye-reset"],
  [/neck|shoulder|chest opener/i, "neck-shoulder"],
  [/walk|step|march|stroll/i, "walking"],
  [/dance|song|shake/i, "dance"],
  [/squat|push.?up|plank|lunge|glute|strength|bridge/i, "strength"],
  [/breath|inhale|exhale|round \d|box breath|belly breath/i, "breathwork"],
  [/yin|restore|recline/i, "yin-yoga"],
  [/stretch|opener|hug|butterfly|massage/i, "stretching"],
  [/meditat|stillness|settle|notice|pause|intention|sense check/i, "meditation"],
];

export function resolveMovementVisual(...texts: (string | undefined | null)[]): MovementVisualKey {
  const joined = texts.filter(Boolean).join(" ");
  for (const [re, key] of KEYWORD_MAP) {
    if (re.test(joined)) return key;
  }
  return "default";
}