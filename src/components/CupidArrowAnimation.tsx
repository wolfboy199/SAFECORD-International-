import { useEffect, useState } from 'react';

interface CupidArrowAnimationProps {
  isActive: boolean;
  onComplete: () => void;
}

export function CupidArrowAnimation({ isActive, onComplete }: CupidArrowAnimationProps) {
  const [showArrow, setShowArrow] = useState(false);
  const [showBow, setShowBow] = useState(false);
  const [shootFromBow, setShootFromBow] = useState(false);

  useEffect(() => {
    if (isActive) {
      // Step 1: Show arrow shooting across input
      setShowArrow(true);
      
      // Step 2: Show bow after arrow reaches it
      setTimeout(() => {
        setShowArrow(false);
        setShowBow(true);
      }, 400);
      
      // Step 3: Shoot from bow to message area
      setTimeout(() => {
        setShootFromBow(true);
      }, 500);
      
      // Step 4: Complete animation
      setTimeout(() => {
        setShowBow(false);
        setShootFromBow(false);
        onComplete();
      }, 900);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <>
      {/* Arrow shooting across input bar */}
      {showArrow && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-50 animate-shoot-arrow pointer-events-none">
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Arrow shaft */}
            <line x1="0" y1="10" x2="30" y2="10" stroke="#FF1493" strokeWidth="2" />
            {/* Arrow head */}
            <path d="M30 10 L25 7 L25 13 Z" fill="#FF1493" />
            {/* Arrow feathers */}
            <path d="M3 7 L0 10 L3 13" stroke="#FF69B4" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}

      {/* Cupid's Bow */}
      {showBow && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <svg width="120" height="120" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={shootFromBow ? 'animate-bow-release' : 'animate-bow-draw'}>
            {/* Bow string */}
            <path d="M15 10 Q30 30 15 50" stroke="#FFB6C1" strokeWidth="2" fill="none" className={shootFromBow ? 'opacity-30' : ''} />
            {/* Bow body */}
            <path d="M12 8 Q8 30 12 52" stroke="#FF69B4" strokeWidth="3" fill="none" />
            {/* Top decoration */}
            <circle cx="12" cy="8" r="3" fill="#FF1493" />
            {/* Bottom decoration */}
            <circle cx="12" cy="52" r="3" fill="#FF1493" />
            {/* Arrow on string (before shoot) */}
            {!shootFromBow && (
              <>
                <line x1="15" y1="30" x2="35" y2="30" stroke="#FF1493" strokeWidth="2" />
                <path d="M35 30 L30 27 L30 33 Z" fill="#FF1493" />
              </>
            )}
          </svg>
        </div>
      )}

      {/* Arrow shooting to message area */}
      {shootFromBow && (
        <div className="absolute right-16 top-1/2 -translate-y-1/2 z-50 animate-shoot-to-messages pointer-events-none">
          <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF1493" />
                <stop offset="100%" stopColor="#FF69B4" />
              </linearGradient>
            </defs>
            {/* Arrow shaft with gradient */}
            <line x1="0" y1="10" x2="30" y2="10" stroke="url(#arrowGradient)" strokeWidth="3" />
            {/* Arrow head */}
            <path d="M30 10 L25 7 L25 13 Z" fill="#FF1493" />
            {/* Sparkles */}
            <circle cx="10" cy="5" r="1" fill="#FFB6C1" className="animate-pulse" />
            <circle cx="20" cy="15" r="1" fill="#FFB6C1" className="animate-pulse" />
            <circle cx="15" cy="8" r="0.5" fill="#FFC0CB" className="animate-pulse" />
          </svg>
        </div>
      )}
    </>
  );
}