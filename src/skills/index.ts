// Import markdown files at build time
import chartsSkill from "./charts.md";
import typographySkill from "./typography.md";
import socialMediaSkill from "./social-media.md";
import transitionsSkill from "./transitions.md";
import sequencingSkill from "./sequencing.md";
import springPhysicsSkill from "./spring-physics.md";

// Guidance skills (markdown files with patterns/rules)
const GUIDANCE_SKILLS = [
  "charts",
  "typography",
  "social-media",
  "transitions",
  "sequencing",
  "spring-physics",
] as const;

export const SKILL_NAMES = [...GUIDANCE_SKILLS] as const;

export type SkillName = (typeof SKILL_NAMES)[number];

// Map guidance skill names to imported content
const guidanceSkillContent: Record<(typeof GUIDANCE_SKILLS)[number], string> = {
  charts: chartsSkill,
  typography: typographySkill,
  "social-media": socialMediaSkill,
  transitions: transitionsSkill,
  sequencing: sequencingSkill,
  "spring-physics": springPhysicsSkill,
};

export function getSkillContent(skillName: SkillName): string {
  // Return imported markdown content
  return (
    guidanceSkillContent[skillName as (typeof GUIDANCE_SKILLS)[number]] || ""
  );
}

export function getCombinedSkillContent(skills: SkillName[]): string {
  if (skills.length === 0) {
    return "";
  }

  const contents = skills
    .map((skill) => getSkillContent(skill))
    .filter((content) => content.length > 0);

  return contents.join("\n\n---\n\n");
}
