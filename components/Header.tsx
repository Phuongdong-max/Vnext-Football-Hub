import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_TITLE } from '../constants';
import { useAppContext, useLanguage } from '../App'; // Added useLanguage
import { UserRole } from '../types';
import { SoccerBallIcon, HomeIcon, ShieldCheckIcon, UserGroupIcon, ArrowsRightLeftIcon } from './icons';
import { ThemeToggleButton } from './ThemeToggleButton';
import { LanguageToggleButton } from './LanguageToggleButton'; // Added LanguageToggleButton

const NavLink: React.FC<{ to: string; children: React.ReactNode; icon: React.ReactNode }> = ({ to, children, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out
                  ${isActive 
                    ? 'bg-primary text-white dark:text-white'
                    : 'text-textPrimary hover:bg-primary/10 hover:text-primary dark:text-slate-200 dark:hover:text-primary dark:hover:bg-primary/20'
                  }`}
    >
      <span className="mr-2">{icon}</span>
      {children}
    </Link>
  );
};

export const Header: React.FC = () => {
  const { currentUser } = useAppContext();
  const { translate } = useLanguage();

  return (
    <header className="bg-surface shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center text-2xl font-bold text-primary mb-2 sm:mb-0">
            <SoccerBallIcon className="w-8 h-8 mr-2"/>
            {translate(APP_TITLE)}
          </Link>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <nav className="flex space-x-2 sm:space-x-4">
            <NavLink to="/" icon={<HomeIcon className="w-5 h-5" />}>{translate('header.home')}</NavLink>
            <NavLink to="/team-divider" icon={<ArrowsRightLeftIcon className="w-5 h-5" />}>{translate('header.teamDivider')}</NavLink>
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