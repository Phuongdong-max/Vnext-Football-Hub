


import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { Button } from './shared/Button';
import { LogoutIcon, UserCircleIcon, GoogleIcon } from './icons'; 

export const AuthComponent: React.FC = () => {
  const { currentUser, signInWithGoogle, logout, isFirebaseReady } = useAppContext();
  const { translate } = useLanguage();

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  if (currentUser) {
    return (
      <div className="bg-primary/10 dark:bg-primary/30 p-3 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-10 h-10 rounded-full mr-3 border-2 border-primary dark:border-orange-400" />
            ) : (
              <UserCircleIcon className="w-10 h-10 text-primary mr-3" />
            )}
            <div>
              <p className="text-sm font-semibold text-textPrimary">{translate('auth.loggedInAs', { name: currentUser.name })}</p>
              <p className="text-xs text-textSecondary">{translate('auth.role', {role: currentUser.role})} | {translate('auth.points', {points: currentUser.points})}</p>
            </div>
          </div>
          <Button onClick={logout} variant="secondary" size="sm">
            <LogoutIcon className="w-4 h-4 mr-1" />
            {translate('auth.logout')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-800/60 p-4 shadow-sm">
      <div className="container mx-auto flex flex-col items-center">
        <h3 className="text-lg font-semibold text-textPrimary mb-3 text-center">{translate('auth.signIn')}</h3>
        {isFirebaseReady ? (
          <Button 
            onClick={handleGoogleLogin} 
            variant="primary" 
            size="md" 
            className="w-full max-w-xs sm:w-auto flex items-center justify-center 
                       bg-white dark:bg-slate-700 
                       border border-gray-300 dark:border-slate-600 
                       text-gray-700 dark:text-slate-200 
                       hover:bg-gray-100 dark:hover:bg-slate-600 
                       focus:ring-blue-500 dark:focus:ring-offset-slate-800"
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            {translate('auth.signInWithGoogle')}
          </Button>
        ) : (
          <p className="text-sm text-textSecondary text-center">{translate('auth.googleSignInUnavailable')}</p>
        )}
          <p className="text-xs text-textSecondary mt-2 text-center">{translate('auth.signInGuidance')}</p>
      </div>
    </div>
  );
};
