"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useRouter } from "next/navigation";
import { LandingPageInput } from "@/components/LandingPageInput";
import type { ModelId } from "@/types/generation";
import { PageLayout } from "@/components/PageLayout";
import { type SkillName } from "@/skills";

const Home: NextPage = () => {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigate = (prompt: string, model: ModelId, attachedImages?: string[], selectedSkills?: SkillName[]) => {
    setIsNavigating(true);
    // Store images in sessionStorage (too large for URL params)
    if (attachedImages && attachedImages.length > 0) {
      sessionStorage.setItem("initialAttachedImages", JSON.stringify(attachedImages));
    } else {
      sessionStorage.removeItem("initialAttachedImages");
    }
    // Store selected skills in sessionStorage
    if (selectedSkills && selectedSkills.length > 0) {
      sessionStorage.setItem("initialSelectedSkills", JSON.stringify(selectedSkills));
    } else {
      sessionStorage.removeItem("initialSelectedSkills");
    }
    const params = new URLSearchParams({ prompt, model });
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <PageLayout>
      <LandingPageInput
        onNavigate={handleNavigate}
        isNavigating={isNavigating}
        showCodeExamplesLink
      />
    </PageLayout>
  );
};

export default Home;
