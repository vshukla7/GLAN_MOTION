"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Code, Play } from "lucide-react";

export type TabId = "code" | "preview";

interface TabPanelProps {
  codeContent: React.ReactNode;
  previewContent: React.ReactNode;
  defaultTab?: TabId;
}

export function TabPanel({
  codeContent,
  previewContent,
  defaultTab = "preview",
}: TabPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  const tabs = [
    { id: "code" as const, label: "Remotion Code", icon: Code },
    { id: "preview" as const, label: "Video Preview", icon: Play },
  ];

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="inline-flex w-fit mb-6 p-1 bg-muted/30 shrink-0 rounded-xl border border-border/50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-6 py-3 text-sm font-semibold rounded-lg transition-all duration-200",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-background/20"
            )}
          >
            <tab.icon className={cn("w-3.5 h-3.5", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">
        {activeTab === "code" ? codeContent : previewContent}
      </div>
    </div>
  );
}
