import { streamText, generateObject, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import {
  getCombinedSkillContent,
  type SkillName,
} from "@/skills";

const SYSTEM_PROMPT = `
You are an expert in generating React components for Remotion animations.

## COMPONENT STRUCTURE

1. Start with ES6 imports
2. Export as: export const MyAnimation = () => { ... };
3. Component body order:
   - Multi-line comment description (2-3 sentences)
   - Hooks (useCurrentFrame, useVideoConfig, etc.)
   - Constants (COLORS, TEXT, TIMING, LAYOUT) - all UPPER_SNAKE_CASE
   - Calculations and derived values
   - return JSX

## CONSTANTS RULES (CRITICAL)

ALL constants MUST be defined INSIDE the component body, AFTER hooks:
- Colors: const COLOR_TEXT = "#000000";
- Text: const TITLE_TEXT = "Hello World";
- Timing: const FADE_DURATION = 20;
- Layout: const PADDING = 40;

This allows users to easily customize the animation.

## LAYOUT RULES

- Use full width of container with appropriate padding
- Never constrain content to a small centered box
- Use Math.max(minValue, Math.round(width * percentage)) for responsive sizing

## ANIMATION RULES

- ALWAYS define const { fps } = useVideoConfig() before using spring()
- Prefer spring() for organic motion: spring({ frame, fps, config: { damping: 12 } })
- Use interpolate() for linear progress (progress bars, opacity fades)
- Always use { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
- Add stagger delays for multiple elements

## CRITICAL REMOTION GOTCHAS (AVOID THESE MISTAKES)

1. **Interpolate Output Range**: 
   - ALWAYS use ONLY numbers in outputRange for interpolate().
   - NEVER use strings with units like "10px" inside interpolate().
   - CORRECT: \`fontSize: interpolate(frame, [0, 10], [12, 24])\`
   - CORRECT WITH UNITS: \`width: \${interpolate(frame, [0, 10], [0, 100])}%\`
   - INCORRECT: \`width: interpolate(frame, [0, 10], ["0%", "100%"])\` (Throws error)

2. **Color Interpolation**:
   - Use interpolateColors() for all color transitions.
   - CORRECT: \`backgroundColor: interpolateColors(frame, [0, 20], ["#ff0000", "#0000ff"])\`

3. **Spring Configuration**:
   - Always provide a config object to spring().
   - Use damping between 10-20, stiffness between 100-200.

## AVAILABLE IMPORTS

\`\`\`tsx
import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, interpolateColors, spring, Sequence } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { Circle, Rect, Triangle, Star, Ellipse, Pie } from "@remotion/shapes";
import { useState, useEffect } from "react";
\`\`\`

## FOCUS: TEXT, SHAPES & IMAGES ONLY
- Use text animations (typography, kinetic text)
- Use shapes from @remotion/shapes (Circle, Rect, Triangle, Star, Ellipse, Pie)
- Use images (static or animated)
- NO 3D objects or complex video effects

## RESERVED NAMES (CRITICAL)

NEVER use these as variable names - they shadow imports:
- spring, interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence

## STYLING RULES

- Use inline styles only
- ALWAYS use fontFamily: 'Inter, sans-serif'
- Keep colors minimal (2-4 max)
- ALWAYS set backgroundColor on AbsoluteFill from frame 0 - never fade in backgrounds

## OUTPUT FORMAT (CRITICAL)

- Output ONLY code - no explanations, no questions
- Response must start with "import" and end with "};"
- If prompt is ambiguous, make a reasonable choice - do not ask for clarification
`;

const FOLLOW_UP_SYSTEM_PROMPT = `
You are an expert at making targeted edits to React/Remotion animation components.

Given the current code and a user request, decide whether to:
1. Use targeted edits (for small, specific changes)
2. Provide full replacement code (for major restructuring)

## WHEN TO USE TARGETED EDITS (type: "edit")
- Changing colors, text, numbers, timing values
- Adding or removing a single element
- Modifying styles or properties
- Small additions (new variable, new element)
- Changes affecting <30% of the code

## WHEN TO USE FULL REPLACEMENT (type: "full")
- Completely different animation style
- Major structural reorganization
- User asks to "start fresh" or "rewrite"
- Changes affect >50% of the code

## EDIT FORMAT
For targeted edits, each edit needs:
- old_string: The EXACT string to find (including whitespace/indentation)
- new_string: The replacement string

CRITICAL:
- old_string must match the code EXACTLY character-for-character
- Include enough surrounding context to make old_string unique
- If multiple similar lines exist, include more surrounding code
- Preserve indentation exactly as it appears in the original

## PRESERVING USER EDITS
If the user has made manual edits, preserve them unless explicitly asked to change.
`;

// Schema for follow-up edit responses
// Note: Using a flat object schema because some models don't support discriminated unions
const FollowUpResponseSchema = z.object({
  type: z
    .enum(["edit", "full"])
    .describe('Use "edit" for small targeted changes, "full" for major restructuring'),
  summary: z
    .string()
    .describe(
      "A brief 1-sentence summary of what changes were made, e.g. 'Changed background color to blue and increased font size'"
    ),
  edits: z
    .array(
      z.object({
        description: z
          .string()
          .describe(
            "Brief description of this edit, e.g. 'Update background color', 'Increase animation duration'"
          ),
        old_string: z
          .string()
          .describe("The exact string to find (must match exactly)"),
        new_string: z.string().describe("The replacement string"),
      })
    )
    .nullable()
    .describe("Required when type is 'edit': array of search-replace operations"),
  code: z
    .string()
    .nullable()
    .describe(
      "Required when type is 'full': the complete replacement code starting with imports"
    ),
});

type EditOperation = {
  description: string;
  old_string: string;
  new_string: string;
  lineNumber?: number;
};

// Calculate line number where a string occurs in code
function getLineNumber(code: string, searchString: string): number {
  const index = code.indexOf(searchString);
  if (index === -1) return -1;
  return code.substring(0, index).split("\n").length;
}

// Apply edit operations to code and enrich with line numbers
function applyEdits(
  code: string,
  edits: EditOperation[]
): {
  success: boolean;
  result: string;
  error?: string;
  enrichedEdits?: EditOperation[];
  failedEdit?: EditOperation;
} {
  let result = code;
  const enrichedEdits: EditOperation[] = [];

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i];
    const { old_string, new_string, description } = edit;

    // Check if the old_string exists
    if (!result.includes(old_string)) {
      return {
        success: false,
        result: code,
        error: `Edit ${i + 1} failed: Could not find the specified text`,
        failedEdit: edit,
      };
    }

    // Check for multiple matches (ambiguous)
    const matches = result.split(old_string).length - 1;
    if (matches > 1) {
      return {
        success: false,
        result: code,
        error: `Edit ${i + 1} failed: Found ${matches} matches.The edit target is ambiguous.`,
        failedEdit: edit,
      };
    }

    // Get line number before applying edit
    const lineNumber = getLineNumber(result, old_string);

    // Apply the edit
    result = result.replace(old_string, new_string);

    // Store enriched edit with line number
    enrichedEdits.push({
      description,
      old_string,
      new_string,
      lineNumber,
    });
  }

  return { success: true, result, enrichedEdits };
}

interface ConversationContextMessage {
  role: "user" | "assistant";
  content: string;
  /** For user messages, attached images as base64 data URLs */
  attachedImages?: string[];
}

interface ErrorCorrectionContext {
  error: string;
  attemptNumber: number;
  maxAttempts: number;
  failedEdit?: {
    description: string;
    old_string: string;
    new_string: string;
  };
}

interface GenerateRequest {
  prompt: string;
  model?: string;
  currentCode?: string;
  conversationHistory?: ConversationContextMessage[];
  isFollowUp?: boolean;
  hasManualEdits?: boolean;
  /** Error correction context for self-healing loops */
  errorCorrection?: ErrorCorrectionContext;
  /** Skills already used in this conversation (to avoid redundant skill content) */
  previouslyUsedSkills?: string[];
  /** Base64 image data URLs for visual context */
  frameImages?: string[];
  /** Manually selected skills from the UI */
  selectedSkills?: SkillName[];
}

interface GenerateResponse {
  code: string;
  summary: string;
  metadata: {
    skills: string[];
    editType: "tool_edit" | "full_replacement";
    edits?: EditOperation[];
    model: string;
  };
}

export async function POST(req: Request) {
  const {
    prompt,
    model: requestedModel = "gemini-2.5-flash",
    currentCode,
    conversationHistory = [],
    isFollowUp = false,
    hasManualEdits = false,
    errorCorrection,
    previouslyUsedSkills = [],
    frameImages,
    selectedSkills = [],
  }: GenerateRequest = await req.json();

  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  console.log(`API Request - Model: ${requestedModel}, IsFollowUp: ${isFollowUp}, Prompt: ${prompt.substring(0, 50)}...`);

  // Validate Gemini API key
  if (!googleApiKey) {
    return new Response(
      JSON.stringify({
        error:
          'The environment variable "GOOGLE_GENERATIVE_AI_API_KEY" is not set. Add it to your .env file and try again.',
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Initialize Gemini model
  const model: LanguageModel = google(requestedModel);


  // Use manually selected skills from the UI
  const detectedSkills: SkillName[] = selectedSkills;

  console.log(
    `Using ${detectedSkills.length} manually selected skill(s): `,
    detectedSkills.length > 0 ? detectedSkills.join(", ") : "none"
  );

  // Filter out skills that were already used in the conversation to avoid redundant context
  const newSkills = detectedSkills.filter(
    (skill) => !previouslyUsedSkills.includes(skill),
  );
  if (previouslyUsedSkills.length > 0 && newSkills.length < detectedSkills.length) {
    console.log(
      `Skipping ${detectedSkills.length - newSkills.length} previously used skills: `,
      detectedSkills.filter((s) => previouslyUsedSkills.includes(s)),
    );
  }

  // Load skill-specific content only for NEW skills (previously used skills are already in context)
  const skillContent = getCombinedSkillContent(newSkills as SkillName[]);
  const enhancedSystemPrompt = skillContent
    ? `${SYSTEM_PROMPT} \n\n## SKILL - SPECIFIC GUIDANCE\n${skillContent} `
    : SYSTEM_PROMPT;

  // FOLLOW-UP MODE: Use non-streaming generateObject for faster edits
  if (isFollowUp && currentCode) {
    try {
      // Build context for the edit request
      const contextMessages = conversationHistory.slice(-6);
      let conversationContext = "";
      if (contextMessages.length > 0) {
        conversationContext =
          "\n\n## RECENT CONVERSATION:\n" +
          contextMessages
            .map((m) => {
              const imageNote =
                m.attachedImages && m.attachedImages.length > 0
                  ? ` [with ${m.attachedImages.length} attached image${m.attachedImages.length > 1 ? "s" : ""}]`
                  : "";
              return `${m.role.toUpperCase()}: ${m.content}${imageNote} `;
            })
            .join("\n");
      }

      const manualEditNotice = hasManualEdits
        ? "\n\nNOTE: The user has made manual edits to the code. Preserve these changes."
        : "";

      // Error correction context for self-healing
      let errorCorrectionNotice = "";
      if (errorCorrection) {
        const failedEditInfo = errorCorrection.failedEdit
          ? `

The previous edit attempt failed.Here's what was tried:
  - Description: ${errorCorrection.failedEdit.description}
- Tried to find: \`${errorCorrection.failedEdit.old_string}\`
- Wanted to replace with: \`${errorCorrection.failedEdit.new_string}\`

The old_string was either not found or matched multiple locations. You MUST include more surrounding context to make the match unique.`
          : "";

        const isEditFailure = errorCorrection.error.includes("Edit") && errorCorrection.error.includes("failed");

        if (isEditFailure) {
          errorCorrectionNotice = `

## EDIT FAILED (ATTEMPT ${errorCorrection.attemptNumber}/${errorCorrection.maxAttempts})
${errorCorrection.error}
${failedEditInfo}

CRITICAL: Your previous edit target was ambiguous or not found. To fix this:
1. Include MORE surrounding code context in old_string to make it unique
2. Make sure old_string matches the code EXACTLY (including whitespace)
3. If the code structure changed, look at the current code carefully`;
        } else {
          errorCorrectionNotice = `

## COMPILATION ERROR (ATTEMPT ${errorCorrection.attemptNumber}/${errorCorrection.maxAttempts})
The previous code failed to compile with this error:
\`\`\`
${errorCorrection.error}
\`\`\`

CRITICAL: Fix this compilation error. Common issues include:
- Syntax errors (missing brackets, semicolons)
- Invalid JSX (unclosed tags, invalid attributes)
- Undefined variables or imports
- TypeScript type errors

Focus ONLY on fixing the error. Do not make other changes.`;
        }
      }

      const editPromptText = `## CURRENT CODE:
\`\`\`tsx
${currentCode}
\`\`\`
${conversationContext}
${manualEditNotice}
${errorCorrectionNotice}

## USER REQUEST:
${prompt}
${frameImages && frameImages.length > 0 ? `\n(See the attached ${frameImages.length === 1 ? "image" : "images"} for visual reference)` : ""}

Analyze the request and decide: use targeted edits (type: "edit") for small changes, or full replacement (type: "full") for major restructuring.`;

      console.log(
        "Follow-up edit with prompt:",
        prompt,
        "model:",
        requestedModel,
        "skills:",
        detectedSkills.length > 0 ? detectedSkills.join(", ") : "general",
        frameImages && frameImages.length > 0 ? `(with ${frameImages.length} image(s))` : ""
      );

      // Build messages array - include images if provided
      const editMessageContent: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
        { type: "text" as const, text: editPromptText },
      ];
      if (frameImages && frameImages.length > 0) {
        for (const img of frameImages) {
          editMessageContent.push({ type: "image" as const, image: img });
        }
      }
      const editMessages: Array<{
        role: "user";
        content: Array<{ type: "text"; text: string } | { type: "image"; image: string }>;
      }> = [
          {
            role: "user" as const,
            content: editMessageContent,
          },
        ];

      const editResult = await generateObject({
        model,
        system: FOLLOW_UP_SYSTEM_PROMPT,
        messages: editMessages,
        schema: FollowUpResponseSchema,
      });

      const response = editResult.object;
      let finalCode: string;
      let editType: "tool_edit" | "full_replacement";
      let appliedEdits: EditOperation[] | undefined;

      if (response.type === "edit" && response.edits) {
        // Apply the edits to the current code
        const result = applyEdits(currentCode, response.edits);
        if (!result.success) {
          // If edits fail, return error with the failed edit details
          return new Response(
            JSON.stringify({
              error: result.error,
              type: "edit_failed",
              failedEdit: result.failedEdit,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        finalCode = result.result;
        editType = "tool_edit";
        // Use enriched edits with line numbers
        appliedEdits = result.enrichedEdits;
        console.log(`Applied ${response.edits.length} edit(s) successfully`);
      } else if (response.type === "full" && response.code) {
        // Full replacement
        finalCode = response.code;
        editType = "full_replacement";
        console.log("Using full code replacement");
      } else {
        // Invalid response - missing required fields
        return new Response(
          JSON.stringify({
            error: "Invalid AI response: missing required fields",
            type: "edit_failed",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Return the result with metadata
      const responseData: GenerateResponse = {
        code: finalCode,
        summary: response.summary,
        metadata: {
          skills: detectedSkills,
          editType,
          edits: appliedEdits,
          model: requestedModel,
        },
      };

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in follow-up edit:", error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : "Something went wrong while processing the edit request.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // INITIAL GENERATION: Use streaming for new animations
  try {
    // Build messages for initial generation (supports image references)
    const hasImages = frameImages && frameImages.length > 0;
    const initialPromptText = hasImages
      ? `${prompt}\n\n(See the attached ${frameImages.length === 1 ? "image" : "images"} for visual reference)`
      : prompt;

    const initialMessageContent: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
      { type: "text" as const, text: initialPromptText },
    ];
    if (hasImages) {
      for (const img of frameImages) {
        initialMessageContent.push({ type: "image" as const, image: img });
      }
    }

    const initialMessages: Array<{
      role: "user";
      content: Array<{ type: "text"; text: string } | { type: "image"; image: string }>;
    }> = [
        {
          role: "user" as const,
          content: initialMessageContent,
        },
      ];

    const result = streamText({
      model,
      system: enhancedSystemPrompt,
      messages: initialMessages,
    });

    return new Response(new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        // 1. Send metadata event first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "metadata",
          skills: detectedSkills
        })}\n\n`));

        let hasReasoningStarted = false;
        let hasTextStarted = false;

        // 2. Stream chunks
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'reasoning-delta') {
              if (!hasReasoningStarted) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reasoning-start" })}\n\n`));
                hasReasoningStarted = true;
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "reasoning",
                delta: part.text
              })}\n\n`));
            } else if (part.type === 'text-delta') {
              if (!hasTextStarted) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "text-start" })}\n\n`));
                hasTextStarted = true;
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "text-delta",
                delta: part.text
              })}\n\n`));
            } else if (part.type === 'error') {
              const errorObj = (part as any).error;
              console.error("Stream error event received:", errorObj);
              const errorMessage = errorObj instanceof Error
                ? errorObj.message
                : typeof errorObj === 'string'
                  ? errorObj
                  : JSON.stringify(errorObj);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: "error",
                error: errorMessage
              })}\n\n`));
            }
          }
        } catch (err) {
          console.error("Streaming error:", err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: "error",
            error: err instanceof Error ? err.message : "Streaming failed"
          })}\n\n`));
        }

        // 3. Close stream
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    }), {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error generating code:", error);
    return new Response(
      JSON.stringify({
        error: "Something went wrong while trying to reach Groq APIs.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
