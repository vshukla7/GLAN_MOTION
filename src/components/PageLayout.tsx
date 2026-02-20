"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { GlowingLight } from "./GlowingLight";

interface PageLayoutProps {
  children: React.ReactNode;
  rightContent?: React.ReactNode;
  showLogoAsLink?: boolean;
}

export function PageLayout({
  children,
  rightContent,
  showLogoAsLink = false,
}: PageLayoutProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure animations only trigger once on initial mount
    setMounted(true);
  }, []);

  return (
    <div className="h-screen w-screen bg-background flex flex-col relative overflow-hidden">
      {/* Glowing light effect - only animate when mounted and on home page */}
      {mounted && isHomePage && <GlowingLight key="glow-once" />}

      {/* Content with animations */}
      <header
        className={`flex justify-between items-center py-4 px-12 shrink-0 relative z-2 animate-fade-in-down delay-nav ${isHomePage ? 'absolute top-0 w-full' : 'relative'
          }`}
      >
        <Header asLink={showLogoAsLink} />
        {rightContent}
      </header>
      <div className={`relative z-1 flex-1 flex flex-col overflow-hidden ${!isHomePage ? 'animate-fade-in-up' : ''}`}>
        {children}
      </div>
    </div>
  );
}
