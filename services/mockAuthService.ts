
// import { User, UserRole } from '../types';
// import { MOCK_USERS_DATA, INITIAL_USER_POINTS } from '../constants';

// export const SESSION_STORAGE_KEY = 'currentUserFootballBetHub'; // No longer needed for mock

// let users: User[] = MOCK_USERS_DATA.map(u => ({
//   ...u,
//   betsMadeCount: u.betsMadeCount || 0,
//   winsCount: u.winsCount || 0,
// }));

// export const getCurrentUser = async (): Promise<User | null> => {
//   const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
//   if (storedUser) {
//     const parsedUser = JSON.parse(storedUser) as User;
//     const dbUser = users.find(u => u.id === parsedUser.id);
//     return dbUser || null;
//   }
//   return null;
// };

// export const mockLogin = async (userId: string): Promise<User | null> => {
//   const user = users.find(u => u.id === userId);
//   if (user) {
//     sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
//     return { ...user };
//   }
//   return null;
// };

// export const mockLogout = async (): Promise<void> => {
//   sessionStorage.removeItem(SESSION_STORAGE_KEY);
// };

// export const getMockUserById = async (userId: string): Promise<User | null> => {
//   const user = users.find(u => u.id === userId);
//   return user ? { ...user } : null;
// };

// export const getAllMockUsers = async (): Promise<User[]> => {
//   return users.map(u => ({ ...u }));
// };

// export const updateUserPointsInMock = (userId: string, newPoints: number): void => {
//   const userIndex = users.findIndex(u => u.id === userId);
//   if (userIndex !== -1) {
//     users[userIndex].points = newPoints;
//     const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
//     if (storedUser) {
//       const parsedUser = JSON.parse(storedUser) as User;
//       if (parsedUser.id === userId) {
//         sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(users[userIndex]));
//       }
//     }
//   }
// };

// export const resetMockUsers = (): void => {
//   users = MOCK_USERS_DATA.map(u => ({
//     ...u,
//     points: INITIAL_USER_POINTS,
//     betsMadeCount: 0,
//     winsCount: 0,
//   }));
//    const storedUserJson = sessionStorage.getItem(SESSION_STORAGE_KEY);
//     if (storedUserJson) {
//         const storedUser = JSON.parse(storedUserJson) as User;
//         const resetUser = users.find(u => u.id === storedUser.id);
//         if (resetUser) {
//             sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(resetUser));
//         } else {
//             sessionStorage.removeItem(SESSION_STORAGE_KEY);
//         }
//     }
// };

// This file is now largely empty as mock auth is removed.
// Kept for structure, could be deleted if no other mock auth utils are planned.
export {};
