"use client";

export function GlowingLight() {
    return (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 pointer-events-none z-0 overflow-hidden w-full h-[70vh] animate-glow-rise delay-glow">
            {/* Mega oval glow - Enlarged */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-[50%] opacity-30"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.2) 25%, rgba(255, 255, 255, 0.05) 50%, transparent 70%)',
                    filter: 'blur(80px)',
                }}
            />

            {/* Secondary glow layer for depth */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-[50%] opacity-40"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.15) 40%, transparent 70%)',
                    filter: 'blur(60px)',
                }}
            />

            {/* Core bright center */}
            <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-[50%] opacity-50"
                style={{
                    background: 'radial-gradient(ellipse at center, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.35) 30%, transparent 60%)',
                    filter: 'blur(40px)',
                }}
            />
        </div>
    );
}
