import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { Button } from './shared/Button';
import { LogoutIcon, UserCircleIcon, GoogleIcon } from './icons';

export const AuthComponent: React.FC = () => {
  const { currentUser, signInWithGoogle, logout, isFirebaseReady, isBettingEnabled } = useAppContext();
  const { translate } = useLanguage();

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  if (currentUser) {
    return (
      <div className="border-b border-border bg-muted/40 px-3 py-2.5">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full mr-3 border border-border"
              />
            ) : (
              <UserCircleIcon className="w-10 h-10 text-primary mr-3" />
            )}
            <div>
              <p className="text-sm font-semibold text-foreground">
                {translate('auth.loggedInAs', { name: currentUser.name })}
              </p>
              <p className="text-xs text-muted-foreground">
                {translate('auth.role', { role: currentUser.role })}
                {isBettingEnabled && ` | ${translate('auth.points', { points: currentUser.points })}`}
              </p>
            </div>
          </div>
          <Button onClick={logout} variant="ghost" size="sm">
            <LogoutIcon className="w-4 h-4 mr-1" />
            {translate('auth.logout')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-muted/40 px-4 py-3.5">
      <div className="container mx-auto flex flex-col items-center">
        <h3 className="text-lg font-semibold text-foreground mb-3 text-center">{translate('auth.signIn')}</h3>
        {isFirebaseReady ? (
          <Button onClick={handleGoogleLogin} variant="outline" size="md" className="w-full max-w-xs sm:w-auto">
            <GoogleIcon className="w-5 h-5 mr-2" />
            {translate('auth.signInWithGoogle')}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground text-center">{translate('auth.googleSignInUnavailable')}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2 text-center">{translate('auth.signInGuidance')}</p>
      </div>
    </div>
  );
};
