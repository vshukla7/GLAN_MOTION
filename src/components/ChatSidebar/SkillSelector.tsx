"use client";

import { type SkillName, SKILL_NAMES } from "@/skills";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface SkillSelectorProps {
    selectedSkills: SkillName[];
    onSkillsChange: (skills: SkillName[]) => void;
    disabled?: boolean;
}


const SKILL_NAMES_CLEAN: Record<SkillName, string> = {
    "charts": "Charts",
    "typography": "Typography",
    "social-media": "Social Media",
    "transitions": "Transitions",
    "sequencing": "Sequencing",
    "spring-physics": "Animation",
};

export function SkillSelector({ selectedSkills, onSkillsChange, disabled }: SkillSelectorProps) {
    const handleSkillToggle = (skillValue: string) => {
        const skill = skillValue as SkillName;

        if (selectedSkills.includes(skill)) {
            // Remove skill
            onSkillsChange(selectedSkills.filter(s => s !== skill));
        } else {
            // Add skill
            onSkillsChange([...selectedSkills, skill]);
        }
    };

    const displayValue = selectedSkills.length > 0
        ? `${selectedSkills.length} skill${selectedSkills.length > 1 ? 's' : ''}`
        : "Add skills";

    return (
        <Select value="" onValueChange={handleSkillToggle} disabled={disabled}>
            <SelectTrigger className="w-auto bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors">
                <SelectValue placeholder={displayValue}>{displayValue}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background-elevated border-border">
                {SKILL_NAMES.map((skill) => (
                    <SelectItem
                        key={skill}
                        value={skill}
                        className={`text-foreground focus:bg-secondary focus:text-foreground ${selectedSkills.includes(skill) ? "font-medium" : ""
                            }`}
                    >
                        {selectedSkills.includes(skill) ? "✓ " : ""}{SKILL_NAMES_CLEAN[skill]}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
