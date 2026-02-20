"use client";

import { useState, useEffect, type ComponentType } from "react";
import { ArrowUp, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ModelId, MODELS } from "@/types/generation";
import { captureFrame } from "@/helpers/capture-frame";
import { useImageAttachments } from "@/hooks/useImageAttachments";
import { SkillSelector } from "./SkillSelector";
import { type SkillName } from "@/skills";

interface ChatInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  isLoading: boolean;
  onSubmit: (attachedImages?: string[], selectedSkills?: SkillName[]) => void;
  selectedSkills: SkillName[];
  onSkillsChange: (skills: SkillName[]) => void;
  // Frame capture props
  Component?: ComponentType | null;
  fps?: number;
  durationInFrames?: number;
  currentFrame?: number;
}

export function ChatInput({
  prompt,
  onPromptChange,
  model,
  onModelChange,
  isLoading,
  onSubmit,
  selectedSkills,
  onSkillsChange,
  Component,
  fps = 30,
  durationInFrames = 150,
  currentFrame = 0,
}: ChatInputProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const {
    attachedImages,
    isDragging,
    addImages,
    removeImage,
    clearImages,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canAddMore,
    error,
    clearError,
  } = useImageAttachments();

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(
      attachedImages.length > 0 ? attachedImages : undefined,
      selectedSkills.length > 0 ? selectedSkills : undefined
    );
    clearImages();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (Shift+Enter for new line)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleCapture = async () => {
    if (!Component || isCapturing || !canAddMore) return;

    setIsCapturing(true);
    try {
      const base64 = await captureFrame(Component, currentFrame, {
        width: 1920,
        height: 1080,
        fps,
        durationInFrames,
      });
      addImages([base64]);
    } catch (error) {
      console.error("Failed to capture frame:", error);
    } finally {
      setIsCapturing(false);
    }
  };

  const canCapture = Component && !isLoading && !isCapturing && canAddMore;

  return (
    <div className="px-3 pt-2 pb-3">
      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "bg-background-elevated/40 backdrop-blur-2xl rounded-2xl border p-4 transition-all duration-300 shadow-2xl",
            isDragging ? "border-primary bg-primary/10 ring-4 ring-primary/20" : "border-border/40 hover:border-border/80"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Error message */}
          {error && (
            <ErrorDisplay
              error={error}
              variant="inline"
              size="sm"
              onDismiss={clearError}
              className="mb-2 py-2"
            />
          )}

          {/* Image previews */}
          {attachedImages.length > 0 && (
            <div className="mb-2">
              <div className="flex gap-2 overflow-x-auto pb-1 pt-2">
                {attachedImages.map((img, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Attached ${index + 1}`}
                      className="h-16 w-16 rounded border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground-dim mt-1">
                Images for reference only, they cannot be embedded in the
                animation
              </p>
            </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              isDragging
                ? "Drop images here..."
                : "Tune your animation... (paste or drop images)"
            }
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground-dim focus:outline-none resize-none text-sm min-h-[40px] max-h-[150px]"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={isLoading}
          />


          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Select
                value={model}
                onValueChange={(value) => onModelChange(value as ModelId)}
                disabled={isLoading}
              >
                <SelectTrigger className="max-w-[140px] bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors text-xs h-7 px-2 truncate">
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent className="bg-background-elevated border-border">
                  {MODELS.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      className="text-foreground focus:bg-secondary focus:text-foreground text-xs"
                    >
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <SkillSelector
                selectedSkills={selectedSkills}
                onSkillsChange={onSkillsChange}
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-1">


              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canCapture}
                onClick={handleCapture}
                className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
                title="Use current frame of Preview as image in chat"
              >
                <Camera className="w-3.5 h-3.5 mr-1" />
              </Button>

              <Button
                type="submit"
                size="icon-sm"
                disabled={!prompt.trim() || isLoading}
                loading={isLoading}
                className="bg-foreground text-background hover:bg-gray-200 h-7 w-7 ml-1"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </form >
    </div >
  );
}
