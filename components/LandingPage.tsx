
import React from 'react';
import { APP_TITLE } from '../constants';
import { SoccerBallIcon, GoogleIcon, PlusIcon, MinusIcon } from './icons'; // Added PlusIcon, MinusIcon
import { Button } from './shared/Button';
import { LoadingSpinner } from './shared/LoadingSpinner';

interface LandingPageProps {
  onSignIn: () => Promise<any | null>; 
  isFirebaseReady: boolean;
}

interface DecorativeElement {
  id: number;
  type: 'ball' | 'plus' | 'minus';
  left: string;
  top: string;
  sizeClass: string; // e.g., 'w-12 h-12'
  opacityClass: string; // e.g., 'opacity-30'
  animationDelay: string; // e.g., '0.5s'
  animationDuration?: string; // Optional specific duration for this element
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn, isFirebaseReady }) => {
  const decorativeElements: DecorativeElement[] = [
    // Soccer Balls
    { id: 1, type: 'ball', left: '10%', top: '15%', sizeClass: 'w-20 h-20 sm:w-28 sm:h-28', opacityClass: 'opacity-20 dark:opacity-10', animationDelay: '0s', animationDuration: '12s' },
    { id: 2, type: 'ball', left: '80%', top: '20%', sizeClass: 'w-12 h-12 sm:w-16 sm:h-16', opacityClass: 'opacity-15 dark:opacity-5', animationDelay: '2s', animationDuration: '10s' },
    { id: 3, type: 'ball', left: '5%', top: '70%', sizeClass: 'w-16 h-16 sm:w-20 sm:h-20', opacityClass: 'opacity-10 dark:opacity-5', animationDelay: '1s', animationDuration: '15s' },
    { id: 4, type: 'ball', left: '85%', top: '75%', sizeClass: 'w-24 h-24 sm:w-32 sm:h-32', opacityClass: 'opacity-25 dark:opacity-15', animationDelay: '3s', animationDuration: '13s' },
    { id: 5, type: 'ball', left: '40%', top: '5%', sizeClass: 'w-8 h-8 sm:w-10 sm:h-10', opacityClass: 'opacity-10 dark:opacity-5', animationDelay: '0.5s', animationDuration: '9s' },
    { id: 12, type: 'ball', left: '60%', top: '85%', sizeClass: 'w-10 h-10 sm:w-12 sm:h-12', opacityClass: 'opacity-15 dark:opacity-10', animationDelay: '1.5s', animationDuration: '11s' },


    // Plus Points
    { id: 6, type: 'plus', left: '20%', top: '30%', sizeClass: 'w-5 h-5', opacityClass: 'opacity-70', animationDelay: '0.2s' },
    { id: 7, type: 'plus', left: '70%', top: '10%', sizeClass: 'w-6 h-6', opacityClass: 'opacity-60', animationDelay: '1.2s' },
    { id: 8, type: 'plus', left: '15%', top: '80%', sizeClass: 'w-4 h-4', opacityClass: 'opacity-70', animationDelay: '2.5s' },
    
    // Minus Points
    { id: 9, type: 'minus', left: '80%', top: '60%', sizeClass: 'w-5 h-5', opacityClass: 'opacity-70', animationDelay: '0.8s' },
    { id: 10, type: 'minus', left: '30%', top: '50%', sizeClass: 'w-6 h-6', opacityClass: 'opacity-60', animationDelay: '1.8s' },
    { id: 11, type: 'minus', left: '65%', top: '90%', sizeClass: 'w-4 h-4', opacityClass: 'opacity-70', animationDelay: '3s' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-8 text-center animated-gradient-bg relative overflow-hidden">
      {/* Decorative Floating Elements */}
      {decorativeElements.map(el => {
        const style = {
          left: el.left,
          top: el.top,
          animationDelay: el.animationDelay,
          animationDuration: el.animationDuration || (el.type === 'ball' ? '10s' : '4s') // Default durations
        };
        if (el.type === 'ball') {
          return (
            <SoccerBallIcon 
              key={el.id} 
              className={`floating-soccer-ball text-white ${el.sizeClass} ${el.opacityClass}`} 
              style={style}
            />
          );
        }
        const Icon = el.type === 'plus' ? PlusIcon : MinusIcon;
        const colorClass = el.type === 'plus' ? 'text-green-400' : 'text-red-400';
        const text = el.type === 'plus' ? '1000' : '500'; // Example points
        return (
          <div 
            key={el.id} 
            className={`floating-points-indicator ${el.opacityClass} ${colorClass}`}
            style={style}
          >
            <Icon className={el.sizeClass} />
            <span className="ml-1 text-xs sm:text-sm">{text}</span>
          </div>
        );
      })}

      {/* Main Content - Centered and above decorations */}
      <div className="relative z-10 flex flex-col items-center animate-fadeInContent">
        <div className="mb-10 sm:mb-12">
          <SoccerBallIcon className="w-28 h-28 sm:w-36 sm:h-36 text-white/95 mx-auto shadow-2xl rounded-full" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.4))' }}/>
          <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.6)' }}>
            {APP_TITLE}
          </h1>
          <p className="mt-4 text-lg sm:text-xl text-slate-200/90" style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.5)' }}>
            Your ultimate hub for friendly football !
          </p>
        </div>

        <div className="mt-4">
          {isFirebaseReady ? (
            <Button
              onClick={onSignIn}
              variant="primary" 
              size="lg"
              className="bg-white hover:bg-gray-100 text-orange-600 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-orange-700
                         font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300
                         px-10 py-3 sm:px-12 sm:py-4 text-md sm:text-lg rounded-full border-2 border-white/50"
            >
              <GoogleIcon className="w-6 h-6 sm:w-7 sm:h-7 mr-3" />
              Sign in with Google
            </Button>
          ) : (
            <div className="flex items-center justify-center p-3 bg-black/30 rounded-lg backdrop-blur-sm">
              <LoadingSpinner size="sm" color="text-white" />
              <p className="ml-3 text-white text-md">Initializing login services...</p>
            </div>
          )}
        </div>
        <p className="mt-10 text-sm sm:text-base text-slate-300/80" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.4)' }}>
          Join the fun, place your bets, and climb the leaderboard!
        </p>
      </div>
      <style>{`
        @keyframes fadeInContent {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeInContent {
          animation: fadeInContent 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
};