"use client";

import {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  type ComponentType,
} from "react";
import { cn } from "@/lib/utils";
import type {
  ConversationMessage,
  ConversationContextMessage,
  AssistantMetadata,
  ErrorCorrectionContext,
  EditOperation,
} from "@/types/conversation";
import {
  type StreamPhase,
  type GenerationErrorType,
  type ModelId,
} from "@/types/generation";
import { ChatInput } from "./ChatInput";
import { ChatHistory } from "./ChatHistory";
import { useGenerationApi } from "@/hooks/useGenerationApi";
import { type SkillName } from "@/skills";

export interface ChatSidebarRef {
  triggerGeneration: (options?: {
    silent?: boolean;
    attachedImages?: string[];
    selectedSkills?: SkillName[];
  }) => void;
}

interface ChatSidebarProps {
  messages: ConversationMessage[];
  pendingMessage?: {
    skills?: string[];
    startedAt: number;
  };
  hasManualEdits: boolean;
  // Generation callbacks
  onCodeGenerated?: (code: string) => void;
  onStreamingChange?: (isStreaming: boolean) => void;
  onStreamPhaseChange?: (phase: StreamPhase) => void;
  onError?: (
    error: string,
    type: GenerationErrorType,
    failedEdit?: EditOperation,
  ) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  currentCode?: string;
  conversationHistory?: ConversationContextMessage[];
  previouslyUsedSkills?: string[];
  isFollowUp?: boolean;
  onMessageSent?: (prompt: string, attachedImages?: string[]) => void;
  onGenerationComplete?: (
    code: string,
    summary?: string,
    metadata?: AssistantMetadata,
  ) => void;
  onErrorMessage?: (
    message: string,
    errorType: "edit_failed" | "api" | "validation",
  ) => void;
  errorCorrection?: ErrorCorrectionContext;
  onPendingMessage?: (skills?: string[]) => void;
  onClearPendingMessage?: () => void;
  // Frame capture props
  Component?: ComponentType | null;
  fps?: number;
  durationInFrames?: number;
  currentFrame?: number;
  initialModel?: ModelId;
}

export const ChatSidebar = forwardRef<ChatSidebarRef, ChatSidebarProps>(
  function ChatSidebar(
    {
      messages,
      pendingMessage,
      hasManualEdits,
      onCodeGenerated,
      onStreamingChange,
      onStreamPhaseChange,
      onError,
      prompt,
      onPromptChange,
      currentCode,
      conversationHistory = [],
      previouslyUsedSkills = [],
      isFollowUp = false,
      onMessageSent,
      onGenerationComplete,
      onErrorMessage,
      errorCorrection,
      onPendingMessage,
      onClearPendingMessage,
      Component,
      fps = 30,
      durationInFrames = 150,
      currentFrame = 0,
      initialModel,
    },
    ref,
  ) {
    const [model, setModel] = useState<ModelId>(initialModel || "gemini-2.5-flash");
    const [selectedSkills, setSelectedSkills] = useState<SkillName[]>([]);
    const promptRef = useRef<string>("");

    const { isLoading, runGeneration } = useGenerationApi();

    // Keep prompt ref in sync for use in triggerGeneration
    useEffect(() => {
      promptRef.current = prompt;
    }, [prompt]);

    const handleGeneration = async (options?: {
      silent?: boolean;
      attachedImages?: string[];
      selectedSkills?: SkillName[];
    }) => {
      const currentPrompt = promptRef.current;
      if (!currentPrompt.trim()) return;

      const skillsToUse = options?.selectedSkills || selectedSkills;

      onPromptChange(""); // Clear input immediately
      setSelectedSkills([]); // Clear selected skills

      await runGeneration(
        currentPrompt,
        model,
        {
          currentCode,
          conversationHistory,
          previouslyUsedSkills,
          isFollowUp,
          hasManualEdits,
          errorCorrection,
          frameImages: options?.attachedImages,
          selectedSkills: skillsToUse,
        },
        {
          onCodeGenerated,
          onStreamingChange,
          onStreamPhaseChange,
          onError,
          onMessageSent,
          onGenerationComplete,
          onErrorMessage,
          onPendingMessage,
          onClearPendingMessage,
        },
        options,
      );
    };

    // Expose triggerGeneration via ref
    useImperativeHandle(ref, () => ({
      triggerGeneration: handleGeneration,
    }));

    return (
      <div
        className={cn(
          "flex flex-col bg-background transition-all duration-300",
          "w-full h-[45vh] min-[1000px]:h-full min-[1000px]:w-[35%] min-[1000px]:min-w-[420px] min-[1000px]:max-w-[550px] shrink-0 overflow-hidden",
        )}
      >
        {/* Chat area with subtle backdrop */}
        <div className="flex-1 flex flex-col min-h-0 mb-0 rounded-2xl rounded-b-none bg-background-elevated/40 border border-border/50 border-b-0 shadow-lg backdrop-blur-md overflow-hidden relative">
          {/* Header */}
          <div className="flex items-start justify-between px-4 pt-4 pb-2">
            <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              Let's create something amazing!
            </h2>
          </div>

          {/* Messages */}
          <ChatHistory
            messages={messages}
            pendingMessage={pendingMessage}
          />

          {/* Input */}
          <ChatInput
            prompt={prompt}
            onPromptChange={onPromptChange}
            model={model}
            onModelChange={setModel}
            isLoading={isLoading}
            onSubmit={(attachedImages, selectedSkills) =>
              handleGeneration({ attachedImages, selectedSkills })
            }
            selectedSkills={selectedSkills}
            onSkillsChange={setSelectedSkills}
            Component={Component}
            fps={fps}
            durationInFrames={durationInFrames}
            currentFrame={currentFrame}
          />
        </div>
      </div>
    );
  },
);
