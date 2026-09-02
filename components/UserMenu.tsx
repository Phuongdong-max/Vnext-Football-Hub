import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { UserRole } from '../types';
import { LogoutIcon, UserCircleIcon, GoogleIcon } from './icons';

// Account controls used to sit in a full-width bar under the header, taking the
// most valuable strip of the page to say "Sign In". They belong in the header
// as a compact control, which is where people look for them.
export const UserMenu: React.FC = () => {
  const { currentUser, signInWithGoogle, logout, isFirebaseReady, isBettingEnabled } = useAppContext();
  const { translate } = useLanguage();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!currentUser) {
    return (
      <button
        onClick={() => signInWithGoogle()}
        disabled={!isFirebaseReady}
        title={isFirebaseReady ? undefined : translate('auth.googleSignInUnavailable')}
        className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-textPrimary shadow-sm transition-colors hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
      >
        <GoogleIcon className="h-4 w-4" />
        <span className="hidden sm:inline">{translate('auth.signIn')}</span>
      </button>
    );
  }

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface pl-1 pr-2 shadow-sm transition-colors hover:bg-black/5 dark:hover:bg-white/10 sm:pr-3"
      >
        {currentUser.avatarUrl ? (
          <img src={currentUser.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <UserCircleIcon className="h-8 w-8 text-textSecondary" />
        )}
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-textPrimary sm:inline">
          {currentUser.name}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
        >
          <div className="border-b border-border p-4">
            <div className="flex items-center gap-3">
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <UserCircleIcon className="h-11 w-11 text-textSecondary" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-textPrimary">{currentUser.name}</p>
                <p className="truncate text-xs text-textSecondary">{currentUser.email}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                isAdmin ? 'bg-primary/15 text-primary' : 'bg-black/5 text-textSecondary dark:bg-white/10'
              }`}>
                {currentUser.role}
              </span>
              {isBettingEnabled && (
                <span className="rounded-md bg-black/5 px-2 py-0.5 text-xs font-medium text-textSecondary dark:bg-white/10">
                  {translate('auth.points', { points: currentUser.points })}
                </span>
              )}
            </div>
          </div>

          <button
            role="menuitem"
            onClick={() => { setOpen(false); logout(); }}
            className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-textPrimary transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <LogoutIcon className="h-4 w-4" />
            {translate('auth.logout')}
          </button>
        </div>
      )}
    </div>
  );
};
