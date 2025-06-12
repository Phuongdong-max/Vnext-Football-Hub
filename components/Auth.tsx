
import React from 'react';
import { useAppContext } from '../App';
import { MOCK_ADMIN_ID, MOCK_MEMBER_ID, MOCK_MEMBER_ID_2, MOCK_USERS_DATA } from '../constants';
import { User } from '../types';
import { Button } from './shared/Button';
import { LoginIcon, LogoutIcon, UserCircleIcon, UsersIcon } from './icons';


export const AuthComponent: React.FC = () => {
  const { currentUser, login, logout } = useAppContext();

  const handleLoginAs = async (userId: string) => {
    await login(userId);
  };

  if (currentUser) {
    return (
      <div className="bg-primary/10 p-3 shadow-sm">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            {currentUser.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-10 h-10 rounded-full mr-3 border-2 border-primary" />
            ) : (
              <UserCircleIcon className="w-10 h-10 text-primary mr-3" />
            )}
            <div>
              <p className="text-sm font-semibold text-textPrimary">Logged in as: {currentUser.name}</p>
              <p className="text-xs text-textSecondary">Role: {currentUser.role} | Points: {currentUser.points}</p>
            </div>
          </div>
          <Button onClick={logout} variant="secondary" size="sm">
            <LogoutIcon className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 shadow-sm">
      <div className="container mx-auto flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2">
        <p className="text-sm font-medium text-textSecondary mr-2 hidden sm:block">
          <UsersIcon className="w-5 h-5 inline mr-1" />
          Switch User (Demo):
        </p>
        {(MOCK_USERS_DATA as User[]).map(user => (
          <Button 
            key={user.id} 
            onClick={() => handleLoginAs(user.id)} 
            variant="outline" 
            size="sm"
            className="w-full sm:w-auto"
          >
            <LoginIcon className="w-4 h-4 mr-1" />
            Login as {user.name} ({user.role})
          </Button>
        ))}
      </div>
    </div>
  );
};
    