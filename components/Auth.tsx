import React from 'react';
import { useAppContext } from '../App';
import { MOCK_USERS_DATA } from '../constants';
import { User } from '../types';
import { Button } from './shared/Button';
import { LoginIcon, LogoutIcon, UserCircleIcon, UsersIcon, GoogleIcon } from './icons'; // Added GoogleIcon

export const AuthComponent: React.FC = () => {
  const { currentUser, loginWithMockUser, signInWithGoogle, logout, isFirebaseReady } = useAppContext();

  const handleLoginAsMockUser = async (userId: string) => {
    await loginWithMockUser(userId);
  };

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
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
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 items-start">
          
          {/* Google Sign-In Section */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-lg font-semibold text-textPrimary mb-3 text-center md:text-left">Sign In</h3>
            {isFirebaseReady ? (
              <Button 
                onClick={handleGoogleLogin} 
                variant="primary" 
                size="md" 
                className="w-full max-w-xs sm:w-auto flex items-center justify-center bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 focus:ring-blue-500"
              >
                <GoogleIcon className="w-5 h-5 mr-2" />
                Sign in with Google
              </Button>
            ) : (
              <p className="text-sm text-textSecondary text-center md:text-left">Google Sign-In is unavailable.</p>
            )}
             <p className="text-xs text-textSecondary mt-2 text-center md:text-left">Use your Google account to participate.</p>
          </div>

          {/* Mock Users Section */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-lg font-semibold text-textPrimary mb-3 text-center md:text-left">
              <UsersIcon className="w-5 h-5 inline mr-1" />
              Or Use a Demo Account
            </h3>
            <div className="space-y-2 w-full max-w-xs sm:w-auto">
              {(MOCK_USERS_DATA as User[]).map(user => (
                <Button 
                  key={user.id} 
                  onClick={() => handleLoginAsMockUser(user.id)} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <LoginIcon className="w-4 h-4 mr-1" />
                  Login as {user.name} ({user.role})
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};