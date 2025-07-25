

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_TITLE } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppContext } from '../contexts/AppContext';
import { UserRole } from '../types';
import { VnfcLogoStatic, HomeIcon, ShieldCheckIcon, UserGroupIcon, ArrowsRightLeftIcon, TrophyIcon } from './icons';
import { ThemeToggleButton } from './ThemeToggleButton';
import { LanguageToggleButton } from './LanguageToggleButton';

const NavLink: React.FC<{ to: string; children: React.ReactNode; icon: React.ReactNode }> = ({ to, children, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  const baseClasses = "flex items-center justify-center sm:justify-start px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out sm:w-auto w-12 h-10";
  const activeClasses = "bg-primary/10 text-primary dark:bg-primary/20 font-semibold";
  const inactiveClasses = "text-textSecondary hover:text-textPrimary hover:bg-black/5 dark:hover:bg-white/10";

  return (
    <Link
      to={to}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
      title={children?.toString()}
    >
      <span className="sm:mr-2">{icon}</span>
      <span className="hidden sm:inline">{children}</span>
    </Link>
  );
};

export const Header: React.FC = () => {
  const { currentUser } = useAppContext();
  const { translate } = useLanguage();

  return (
    <header className="bg-surface shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-2 sm:px-4 py-3 flex items-center justify-between">
        <div className="flex items-center flex-shrink-0">
          <Link to="/" className="flex items-center text-xl sm:text-2xl font-bold text-primary">
            <VnfcLogoStatic className="w-8 h-8 mr-2"/>
            <span className="hidden sm:inline">{translate(APP_TITLE)}</span>
            <span className="sm:hidden">VNFCH</span>
          </Link>
        </div>
        <div className="flex items-center justify-end flex-wrap gap-x-1 sm:gap-x-2 gap-y-1">
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <NavLink to="/" icon={<HomeIcon className="w-5 h-5" />}>{translate('header.home')}</NavLink>
            <NavLink to="/team-divider" icon={<ArrowsRightLeftIcon className="w-5 h-5" />}>{translate('header.teamDivider')}</NavLink>
            <NavLink to="/tournament" icon={<TrophyIcon className="w-5 h-5" />}>{translate('header.tournament')}</NavLink>
            {currentUser?.role === UserRole.ADMIN && (
              <NavLink to="/admin" icon={<ShieldCheckIcon className="w-5 h-5" />}>{translate('header.adminDashboard')}</NavLink>
            )}
            <NavLink to="/leaderboard" icon={<UserGroupIcon className="w-5 h-5" />}>{translate('header.leaderboard')}</NavLink>
          </nav>
          <ThemeToggleButton />
          <LanguageToggleButton />
        </div>
      </div>
    </header>
  );
};