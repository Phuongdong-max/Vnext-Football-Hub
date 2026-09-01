import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { UserRole } from '../types';
import { HomeIcon, ShieldCheckIcon, ArrowsRightLeftIcon, TrophyIcon, UsersIcon } from './icons';
import { VnextMark } from './VnextLogo';
import { ThemeToggleButton } from './ThemeToggleButton';
import { LanguageToggleButton } from './LanguageToggleButton';

const NavLink: React.FC<{ to: string; children: React.ReactNode; icon: React.ReactNode }> = ({
  to,
  children,
  icon,
}) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  const baseClasses =
    'flex items-center justify-center sm:justify-start gap-2 h-11 w-11 sm:h-10 sm:w-auto sm:px-3 rounded-md text-sm font-medium ' +
    'transition-all duration-150 ease-spring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50';
  const activeClasses = 'bg-primary/10 text-vnext-deep dark:text-primary font-semibold';
  const inactiveClasses = 'text-muted-foreground hover:text-foreground hover:bg-muted/60';

  return (
    <Link
      to={to}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      aria-current={isActive ? 'page' : undefined}
      title={children?.toString()}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
};

export const Header: React.FC = () => {
  const { currentUser } = useAppContext();
  const { translate } = useLanguage();

  return (
    <header className="glass-navbar sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-3">
        <Link
          to="/home"
          className="flex items-center gap-2.5 flex-shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="VNEXT Football Hub"
        >
          <VnextMark size={26} />
          <span className="font-heading font-bold tracking-tight text-foreground text-base sm:text-lg">
            <span className="hidden sm:inline">Football Hub</span>
            <span className="sm:hidden">Hub</span>
          </span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label={translate('header.home')}>
            <NavLink to="/home" icon={<HomeIcon className="w-5 h-5" />}>
              {translate('header.home')}
            </NavLink>
            <NavLink to="/team-divider" icon={<ArrowsRightLeftIcon className="w-5 h-5" />}>
              {translate('header.teamDivider')}
            </NavLink>
            <NavLink to="/tournament" icon={<TrophyIcon className="w-5 h-5" />}>
              {translate('header.tournament')}
            </NavLink>
            <NavLink to="/player-info" icon={<UsersIcon className="w-5 h-5" />}>
              {translate('header.playerInfo')}
            </NavLink>
            {currentUser?.role === UserRole.ADMIN && (
              <NavLink to="/admin" icon={<ShieldCheckIcon className="w-5 h-5" />}>
                {translate('header.adminDashboard')}
              </NavLink>
            )}
          </nav>
          <span className="w-px h-6 bg-border mx-1 hidden sm:block" aria-hidden="true" />
          <ThemeToggleButton />
          <LanguageToggleButton />
        </div>
      </div>
    </header>
  );
};
