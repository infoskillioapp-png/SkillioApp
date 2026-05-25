"use client"

import React, { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  glowColor?: string
  children: React.ReactNode
}

export function GlowButton({
  glowColor = "rgba(165, 64, 45, 0.6)",
  className,
  children,
  ...props
}: GlowButtonProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [glowPosition, setGlowPosition] = useState(50)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!buttonRef.current || !isHovering) return
      const rect = buttonRef.current.getBoundingClientRect()
      const x = event.clientX - rect.left
      const percentage = (x / rect.width) * 100
      setGlowPosition(percentage)
    }
    if (isHovering) window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [isHovering])

  return (
    <button
      ref={buttonRef}
      className={cn(
        "relative overflow-hidden px-8 py-3 rounded-full font-display font-bold text-sm transition-all duration-300 active:translate-y-[1px]",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      <div
        className="pointer-events-none absolute -z-10 flex w-[200px] items-center justify-center"
        style={{
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
          transform: `translateX(calc(${glowPosition}% - 100px)) translateZ(0)`,
          opacity: isHovering ? 1 : 0,
          transition: "opacity 0.2s ease, transform 0.1s ease",
        }}
      >
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[120px] h-[120px] blur-2xl rounded-full"
          style={{ background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        />
      </div>
      {children}
    </button>
  )
}

export default GlowButton