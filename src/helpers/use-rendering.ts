import { useCallback, useMemo, useState } from "react";
import { renderMediaOnWeb } from "@remotion/web-renderer";

export type State =
  | {
    status: "init";
  }
  | {
    status: "invoking";
  }
  | {
    progress: number;
    status: "rendering";
  }
  | {
    status: "error";
    error: Error;
  }
  | {
    url: string;
    size: number;
    status: "done";
  };

export const useRendering = ({
  durationInFrames,
  fps,
  Component,
}: {
  code: string;
  durationInFrames: number;
  fps: number;
  Component: React.ComponentType | null;
}) => {
  const [state, setState] = useState<State>({
    status: "init",
  });

  const renderMedia = useCallback(async () => {
    if (!Component) {
      setState({
        status: "error",
        error: new Error("Component is not ready yet"),
      });
      return;
    }

    setState({
      status: "invoking",
    });

    try {
      const result = await renderMediaOnWeb({
        composition: {
          id: "animation",
          component: Component,
          durationInFrames,
          fps,
          width: 1920,
          height: 1080,
        },
        onProgress: ({ renderedFrames }) => {
          setState({
            status: "rendering",
            progress: renderedFrames / durationInFrames,
          });
        },
      });

      const blob = await result.getBlob();
      const url = URL.createObjectURL(blob);

      setState({
        url,
        size: blob.size,
        status: "done",
      });
    } catch (err) {
      console.error("Render failed:", err);
      setState({
        status: "error",
        error: err as Error,
      });
    }
  }, [Component, durationInFrames, fps]);

  const undo = useCallback(() => {
    setState({ status: "init" });
  }, []);

  return useMemo(() => {
    return {
      renderMedia,
      state,
      undo,
    };
  }, [renderMedia, state, undo]);
};
