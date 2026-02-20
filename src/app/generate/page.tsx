"use client";

import {
  useState,
  useEffect,
  useRef,
  Suspense,
  useCallback,
} from "react";
import type { NextPage } from "next";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { CodeEditor } from "@/components/CodeEditor";
import { AnimationPlayer } from "@/components/AnimationPlayer";
import { PageLayout } from "@/components/PageLayout";
import { ChatSidebar, type ChatSidebarRef } from "@/components/ChatSidebar/ChatSidebar";
import { TabPanel } from "@/components/TabPanel";
import { useAnimationState } from "@/hooks/useAnimationState";
import { useConversationState } from "@/hooks/useConversationState";
import { examples } from "@/examples/code";
import { type StreamPhase, type ModelId, type GenerationErrorType } from "@/types/generation";
import { type EditOperation, type AssistantMetadata } from "@/types/conversation";

function GeneratePageContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";
  const initialModel = (searchParams.get("model") as ModelId) || undefined;

  const willAutoStart = Boolean(initialPrompt);

  const [durationInFrames, setDurationInFrames] = useState(
    examples[0]?.durationInFrames || 150,
  );
  const [fps, setFps] = useState(examples[0]?.fps || 30);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isStreaming, setIsStreaming] = useState(willAutoStart);
  const [streamPhase, setStreamPhase] = useState<StreamPhase>(
    willAutoStart ? "reasoning" : "idle",
  );
  const [prompt, setPrompt] = useState(initialPrompt);
  const [hasAutoStarted, setHasAutoStarted] = useState(false);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);
  const [generationError, setGenerationError] = useState<{
    message: string;
    type: GenerationErrorType;
    failedEdit?: EditOperation;
  } | null>(null);

  const {
    messages,
    hasManualEdits,
    pendingMessage,
    addUserMessage,
    addAssistantMessage,
    addErrorMessage,
    getFullContext,
    getPreviouslyUsedSkills,
    setPendingMessage,
    clearPendingMessage,
    isFirstGeneration,
  } = useConversationState();

  const {
    code,
    Component,
    error: codeError,
    isCompiling,
    setCode,
    compileCode
  } = useAnimationState(examples[0]?.code || "");

  const chatSidebarRef = useRef<ChatSidebarRef>(null);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    setGenerationError(null);
  }, [setCode]);

  const handleStreamingChange = useCallback((streaming: boolean) => {
    setIsStreaming(streaming);
    if (streaming) {
      setGenerationError(null);
      setHasGeneratedOnce(true);
    } else {
      setStreamPhase("idle");
    }
  }, []);

  const handleMessageSent = useCallback((prompt: string, attachedImages?: string[]) => {
    addUserMessage(prompt, attachedImages);
  }, [addUserMessage]);

  const handleGenerationComplete = useCallback((
    finalCode: string,
    summary?: string,
    metadata?: AssistantMetadata
  ) => {
    addAssistantMessage(summary || "Animation updated", finalCode, metadata);
    compileCode(finalCode);
  }, [addAssistantMessage, compileCode]);

  const handleError = useCallback((
    message: string,
    type: GenerationErrorType,
    failedEdit?: EditOperation
  ) => {
    setGenerationError({ message, type, failedEdit });
    setIsStreaming(false);
    setStreamPhase("idle");
  }, []);

  const handleRuntimeError = useCallback((message: string) => {
    addErrorMessage(message, "api");
  }, [addErrorMessage]);

  // Handle auto-start from URL prompt
  useEffect(() => {
    if (initialPrompt && !hasAutoStarted && chatSidebarRef.current) {
      setHasAutoStarted(true);
      setTimeout(() => {
        chatSidebarRef.current?.triggerGeneration();
      }, 100);
    }
  }, [initialPrompt, hasAutoStarted]);

  return (
    <PageLayout showLogoAsLink>
      <div className="flex-1 flex flex-col min-[1000px]:flex-row min-w-0 overflow-hidden px-4 lg:px-8 pb-0 gap-6">
        {/* Chat History Sidebar */}
        <ChatSidebar
          ref={chatSidebarRef}
          messages={messages}
          pendingMessage={pendingMessage}
          hasManualEdits={hasManualEdits}
          onCodeGenerated={handleCodeChange}
          onStreamingChange={handleStreamingChange}
          onStreamPhaseChange={setStreamPhase}
          onError={handleError}
          prompt={prompt}
          onPromptChange={setPrompt}
          currentCode={code}
          conversationHistory={getFullContext()}
          previouslyUsedSkills={getPreviouslyUsedSkills()}
          isFollowUp={!isFirstGeneration}
          onMessageSent={handleMessageSent}
          onGenerationComplete={handleGenerationComplete}
          onErrorMessage={addErrorMessage}
          onPendingMessage={setPendingMessage}
          onClearPendingMessage={clearPendingMessage}
          Component={Component}
          fps={fps}
          durationInFrames={durationInFrames}
          currentFrame={currentFrame}
          initialModel={initialModel}
        />

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <TabPanel
            codeContent={
              <CodeEditor
                code={hasGeneratedOnce && !generationError ? code : ""}
                onChange={handleCodeChange}
                isStreaming={isStreaming}
                streamPhase={streamPhase}
              />
            }
            previewContent={
              <AnimationPlayer
                Component={generationError ? null : Component}
                durationInFrames={durationInFrames}
                fps={fps}
                onDurationChange={setDurationInFrames}
                onFpsChange={setFps}
                isCompiling={isCompiling}
                isStreaming={isStreaming}
                error={generationError?.message || codeError}
                errorType={generationError?.type || "compilation"}
                code={code}
                onRuntimeError={handleRuntimeError}
                onFrameChange={setCurrentFrame}
              />
            }
          />
        </div>
      </div>
    </PageLayout>
  );
}

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-foreground" />
    </div>
  );
}

const GeneratePage: NextPage = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <GeneratePageContent />
    </Suspense>
  );
};

export default GeneratePage;
