import { useEffect, useState } from 'react';

export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Holiday = 'valentine' | 'halloween' | 'christmas' | 'newyear' | 'easter' | 'none';

interface SeasonalBackgroundProps {
  season?: Season;
  holiday?: Holiday;
  children: React.ReactNode;
}

// Helper functions defined outside component
function getCurrentSeasonHelper(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function getActiveHolidayHelper(): Holiday {
  const month = new Date().getMonth() + 1;
  const day = new Date().getDate();
  
  // Check if seasonal mode is enabled
  const seasonalMode = localStorage.getItem('seasonalMode') === 'true';
  
  // If seasonal mode is disabled, only show during first week
  if (!seasonalMode) {
    // Valentine's Day (Feb 1-7 only)
    if (month === 2 && day <= 7) return 'valentine';
    // Easter (First week of April)
    if (month === 4 && day <= 7) return 'easter';
    // Halloween (Oct 1-7 only)
    if (month === 10 && day <= 7) return 'halloween';
    // Christmas (Dec 1-7 only)
    if (month === 12 && day <= 7) return 'christmas';
    // New Year (Dec 26-31, Jan 1-7)
    if ((month === 12 && day > 25) || (month === 1 && day <= 7)) return 'newyear';
    
    return 'none';
  }
  
  // If seasonal mode is enabled, show for full duration
  // Valentine's Day (Feb 1-14)
  if (month === 2 && day <= 14) return 'valentine';
  // Easter (March-April, simplified check)
  if (month === 3 || (month === 4 && day <= 15)) return 'easter';
  // Halloween (October)
  if (month === 10) return 'halloween';
  // Christmas (Dec 1-25)
  if (month === 12 && day <= 25) return 'christmas';
  // New Year (Dec 26-31, Jan 1-7)
  if ((month === 12 && day > 25) || (month === 1 && day <= 7)) return 'newyear';
  
  return 'none';
}

export function SeasonalBackground({ season, holiday = 'none', children }: SeasonalBackgroundProps) {
  const [currentSeason, setCurrentSeason] = useState<Season>(season || getCurrentSeasonHelper());
  const [currentHoliday, setCurrentHoliday] = useState<Holiday>(holiday);

  useEffect(() => {
    if (!season) {
      setCurrentSeason(getCurrentSeasonHelper());
    }
  }, [season]);

  useEffect(() => {
    if (holiday === 'none') {
      setCurrentHoliday(getActiveHolidayHelper());
    }
  }, [holiday]);

  const getBackgroundStyle = () => {
    // Holiday themes take priority
    if (currentHoliday !== 'none') {
      switch (currentHoliday) {
        case 'valentine':
          return {
            background: `
              radial-gradient(circle at 20% 80%, rgba(255, 20, 147, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(255, 105, 180, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(219, 39, 119, 0.05) 0%, transparent 60%),
              linear-gradient(135deg, #0a0a1f 0%, #1a0a2e 50%, #2a0a3e 100%)
            `,
          };
        case 'halloween':
          return {
            background: `
              radial-gradient(circle at 15% 85%, rgba(255, 140, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 85% 15%, rgba(138, 43, 226, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 0.3) 0%, transparent 70%),
              linear-gradient(135deg, #0a0a1f 0%, #1a0a1a 50%, #2a0a0a 100%)
            `,
          };
        case 'christmas':
          return {
            background: `
              radial-gradient(circle at 25% 75%, rgba(34, 139, 34, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 75% 25%, rgba(220, 20, 60, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 50% 10%, rgba(255, 215, 0, 0.05) 0%, transparent 40%),
              linear-gradient(135deg, #0a0a1f 0%, #0a1a0a 50%, #1a0a1a 100%)
            `,
          };
        case 'newyear':
          return {
            background: `
              radial-gradient(circle at 30% 70%, rgba(255, 215, 0, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 30%, rgba(192, 192, 192, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.05) 0%, transparent 60%),
              linear-gradient(135deg, #0a0a1f 0%, #1a1a2e 50%, #2a2a3e 100%)
            `,
          };
        case 'easter':
          return {
            background: `
              radial-gradient(circle at 20% 80%, rgba(255, 182, 193, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(173, 216, 230, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(144, 238, 144, 0.05) 0%, transparent 60%),
              linear-gradient(135deg, #0a0a1f 0%, #0a1a1f 50%, #1a1a2e 100%)
            `,
          };
      }
    }

    // Season themes
    switch (currentSeason) {
      case 'spring':
        return {
          background: `
            radial-gradient(circle at 20% 80%, rgba(144, 238, 144, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 182, 193, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(152, 251, 152, 0.04) 0%, transparent 60%),
            linear-gradient(135deg, #0a0a1f 0%, #0a1a1a 50%, #1a1a2e 100%)
          `,
        };
      case 'summer':
        return {
          background: `
            radial-gradient(circle at 50% 10%, rgba(255, 215, 0, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 165, 0, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 20% 50%, rgba(30, 144, 255, 0.05) 0%, transparent 60%),
            linear-gradient(135deg, #0a0a1f 0%, #1a1a2e 50%, #2a2a3e 100%)
          `,
        };
      case 'fall':
        return {
          background: `
            radial-gradient(circle at 20% 80%, rgba(255, 140, 0, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(205, 92, 92, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(139, 69, 19, 0.05) 0%, transparent 60%),
            linear-gradient(135deg, #0a0a1f 0%, #1a0a0a 50%, #2a1a1a 100%)
          `,
        };
      case 'winter':
        return {
          background: `
            radial-gradient(circle at 20% 80%, rgba(173, 216, 230, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(176, 224, 230, 0.06) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(240, 248, 255, 0.04) 0%, transparent 60%),
            linear-gradient(135deg, #0a0a1f 0%, #0a1a2e 50%, #1a1a3e 100%)
          `,
        };
      default:
        return {
          background: 'linear-gradient(135deg, #0a0a1f 0%, #1a1a2e 50%, #2a2a3e 100%)',
        };
    }
  };

  return (
    <div className="fixed inset-0 transition-all duration-1000" style={getBackgroundStyle()}>
      {children}
    </div>
  );
}

// Export helper functions for use elsewhere
export { getCurrentSeasonHelper, getActiveHolidayHelper };