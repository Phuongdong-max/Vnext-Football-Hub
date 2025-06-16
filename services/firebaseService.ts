
import { firebaseConfig } from '../firebaseConfig';
import { User, UserRole, LeaderboardEntry, BettingRound, FootballMatch, Bet, BetTeamSelection, MatchResultTeam, BettingRoundStatus } from '../types';
import { INITIAL_USER_POINTS } from '../constants';

// Declare Firebase types for global scope (since SDK is loaded via script tag)
declare global {
  interface Window { firebase: any; }
}

let app: any = null; // Firebase App instance
let auth: any = null; // Firebase Auth instance
let db: any = null;  // Firebase Firestore instance

export const initializeFirebase = () => {
  if (!window.firebase) {
    console.error("Firebase SDK not loaded. Ensure firebase scripts are in index.html");
    return false;
  }
  if (!app && window.firebase.apps && !window.firebase.apps.length) { // Check if already initialized
    try {
      app = window.firebase.initializeApp(firebaseConfig);
      auth = window.firebase.auth();
      db = window.firebase.firestore();
      // Enable offline persistence (optional, but good for UX)
      // try {
      //   db.enablePersistence().catch((err: any) => {
      //     if (err.code === 'failed-precondition') {
      //       console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      //     } else if (err.code === 'unimplemented') {
      //       console.warn('The current browser does not support all of the features required to enable persistence.');
      //     }
      //   });
      // } catch (e) {
      //    console.error("Error enabling Firestore persistence:", e);
      // }
      console.log("Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      alert("Could not initialize Firebase. Please check your firebaseConfig.ts and Firebase project setup.");
      return false;
    }
  } else if (window.firebase.apps && window.firebase.apps.length > 0) {
    // Already initialized
    app = window.firebase.app(); // Get default app
    auth = window.firebase.auth();
    db = window.firebase.firestore();
    return true;
  }
  return false;
};


export const onFirebaseAuthStateChanged = (callback: (user: User | null) => void) => {
  if (!auth) {
    console.warn("Firebase Auth not initialized. Call initializeFirebase first.");
    return () => {}; // Return an empty unsubscribe function
  }
  return auth.onAuthStateChanged(async (firebaseUser: any) => {
    if (firebaseUser) {
      const appUser = await findOrCreateUserProfile(firebaseUser);
      callback(appUser);
    } else {
      callback(null);
    }
  });
};

export const signInWithGoogle = async (): Promise<any | null> => {
  if (!auth) {
    console.error("Firebase Auth not initialized.");
    throw new Error("Firebase Auth not initialized.");
  }
  const provider = new window.firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    return result.user; // Firebase User object
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
};

export const firebaseSignOut = async (): Promise<void> => {
  if (!auth) {
    console.error("Firebase Auth not initialized.");
    return;
  }
  try {
    await auth.signOut();
  } catch (error) {
    console.error("Firebase Sign-Out Error:", error);
  }
};

export const findOrCreateUserProfile = async (firebaseUser: any): Promise<User> => {
  if (!db) {
    console.error("Firestore not initialized.");
    throw new Error("Firestore not initialized.");
  }
  const userRef = db.collection('users').doc(firebaseUser.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    // Create new user profile
    const newUserProfile: User = {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous User',
      email: firebaseUser.email || '',
      avatarUrl: firebaseUser.photoURL || undefined,
      role: UserRole.MEMBER, // Default role
      points: INITIAL_USER_POINTS,
      betsMadeCount: 0, // Initialize new field
      winsCount: 0,     // Initialize new field
    };
    await userRef.set(newUserProfile);
    return newUserProfile;
  } else {
    // User exists, return their profile
    const data = doc.data();
    return {
      id: firebaseUser.uid,
      name: data.name || firebaseUser.displayName || 'Anonymous User',
      email: data.email || firebaseUser.email || '',
      avatarUrl: data.avatarUrl || firebaseUser.photoURL || undefined,
      role: data.role || UserRole.MEMBER,
      points: typeof data.points === 'number' ? data.points : INITIAL_USER_POINTS,
      betsMadeCount: typeof data.betsMadeCount === 'number' ? data.betsMadeCount : 0,
      winsCount: typeof data.winsCount === 'number' ? data.winsCount : 0,
    };
  }
};

export const updateUserPointsInFirestore = async (userId: string, newPoints: number): Promise<void> => {
  if (!db) {
    console.error("Firestore not initialized.");
    throw new Error("Firestore not initialized.");
  }
  const userRef = db.collection('users').doc(userId);
  try {
    await userRef.update({ points: newPoints });
  } catch (error) {
    console.error("Error updating points in Firestore:", error);
    throw error;
  }
};

export const getAppUserProfile = async (userId: string): Promise<User | null> => {
    if (!db) {
        console.error("Firestore not initialized.");
        return null;
    }
    const userRef = db.collection('users').doc(userId);
    const doc = await userRef.get();
    if (doc.exists) {
        // Cast to User, ensuring all fields are present or defaulted
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name || 'Anonymous User',
            email: data.email || '',
            avatarUrl: data.avatarUrl || undefined,
            role: data.role || UserRole.MEMBER,
            points: typeof data.points === 'number' ? data.points : INITIAL_USER_POINTS,
            betsMadeCount: typeof data.betsMadeCount === 'number' ? data.betsMadeCount : 0,
            winsCount: typeof data.winsCount === 'number' ? data.winsCount : 0,
        } as User;
    }
    return null;
};

// --- Betting Round Functions ---

export const createFirebaseBettingRound = async (match: FootballMatch, adminUserId: string): Promise<BettingRound> => {
  if (!db) throw new Error("Firestore not initialized.");
  
  // Check if a round for this match already exists (optional, depends on business logic)
  const existingRoundQuery = await db.collection('bettingRounds').where('matchId', '==', match.id).limit(1).get();
  if (!existingRoundQuery.empty) {
    throw new Error("A betting round for this match already exists in Firebase.");
  }

  const newRoundRef = db.collection('bettingRounds').doc(); // Auto-generate ID
  const newRoundData: BettingRound = {
    id: newRoundRef.id,
    matchId: match.id,
    matchDetails: { // Store a snapshot of match details
        ...match,
        startTime: window.firebase.firestore.Timestamp.fromDate(new Date(match.startTime)), // Convert to Firestore Timestamp
    },
    status: BettingRoundStatus.OPEN,
    bets: [],
    bettorIds: [],
    createdBy: adminUserId,
    createdAt: window.firebase.firestore.Timestamp.now(), // Firestore Timestamp
  };
  await newRoundRef.set(newRoundData);
  // Convert Timestamps back to Dates for client-side use
  return {
      ...newRoundData,
      matchDetails: {
          ...newRoundData.matchDetails,
          startTime: (newRoundData.matchDetails.startTime as any).toDate(),
      },
      createdAt: (newRoundData.createdAt as any).toDate(),
  };
};

const mapFirestoreTimestampToDate = (round: any): BettingRound => {
  return {
    ...round,
    matchDetails: {
      ...round.matchDetails,
      startTime: round.matchDetails.startTime.toDate(),
    },
    createdAt: round.createdAt.toDate(),
    bets: round.bets.map((bet: any) => ({
      ...bet,
      timestamp: bet.timestamp.toDate(),
    })),
  };
};

export const getFirebaseBettingRoundById = async (roundId: string): Promise<BettingRound | null> => {
  if (!db) throw new Error("Firestore not initialized.");
  const roundRef = db.collection('bettingRounds').doc(roundId);
  const doc = await roundRef.get();
  if (!doc.exists) return null;
  return mapFirestoreTimestampToDate(doc.data());
};

export const getFirebaseBettingRoundsByAdmin = async (adminId: string): Promise<BettingRound[]> => {
  if (!db) throw new Error("Firestore not initialized.");
  const querySnapshot = await db.collection('bettingRounds')
                              .where('createdBy', '==', adminId)
                              .orderBy('createdAt', 'desc')
                              .get();
  return querySnapshot.docs.map((doc: any) => mapFirestoreTimestampToDate(doc.data()));
};

export const getFirebaseOpenBettingRounds = async (): Promise<BettingRound[]> => {
  if (!db) throw new Error("Firestore not initialized.");
  const querySnapshot = await db.collection('bettingRounds')
                              .where('status', '==', BettingRoundStatus.OPEN)
                              .orderBy('matchDetails.startTime', 'asc')
                              .get();
  return querySnapshot.docs.map((doc: any) => mapFirestoreTimestampToDate(doc.data()));
};

export const getFirebaseClosedBettingRoundsForMember = async (userId: string): Promise<BettingRound[]> => {
  if (!db) throw new Error("Firestore not initialized.");
  const querySnapshot = await db.collection('bettingRounds')
                              .where('bettorIds', 'array-contains', userId)
                              .where('status', 'in', [BettingRoundStatus.CLOSED, BettingRoundStatus.RESULT_UPDATED])
                              .orderBy('matchDetails.startTime', 'desc')
                              .get();
  return querySnapshot.docs.map((doc: any) => mapFirestoreTimestampToDate(doc.data()));
};

export const placeFirebaseBet = async (
  roundId: string, 
  userId: string, 
  userName: string, 
  selectedTeam: BetTeamSelection, 
  pointsBet: number
): Promise<Bet> => {
  if (!db) throw new Error("Firestore not initialized.");
  if (pointsBet <= 0) throw new Error("Points bet must be positive.");

  const roundRef = db.collection('bettingRounds').doc(roundId);
  const userRef = db.collection('users').doc(userId);

  const newBet: Bet = {
    userId,
    userName,
    roundId,
    selectedTeam,
    pointsBet,
    timestamp: window.firebase.firestore.Timestamp.now(), // Firestore Timestamp
  };

  await db.runTransaction(async (transaction: any) => {
    const roundDoc = await transaction.get(roundRef);
    if (!roundDoc.exists) throw new Error("Betting round not found.");
    const roundData = roundDoc.data() as BettingRound;

    if (roundData.status !== BettingRoundStatus.OPEN) throw new Error("This round is not open for betting.");
    if (roundData.bets.some(b => b.userId === userId)) throw new Error("You have already placed a bet on this round.");

    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new Error("User not found.");
    const userData = userDoc.data() as User;

    if (userData.points < pointsBet) throw new Error("Insufficient points.");

    transaction.update(roundRef, {
      bets: window.firebase.firestore.FieldValue.arrayUnion(newBet),
      bettorIds: window.firebase.firestore.FieldValue.arrayUnion(userId),
    });
    transaction.update(userRef, {
      points: window.firebase.firestore.FieldValue.increment(-pointsBet),
      betsMadeCount: window.firebase.firestore.FieldValue.increment(1),
    });
  });

  return { ...newBet, timestamp: (newBet.timestamp as any).toDate() }; // Convert timestamp for client
};

export const updateFirebaseMatchResult = async (roundId: string, winningTeam: MatchResultTeam): Promise<BettingRound> => {
  if (!db) throw new Error("Firestore not initialized.");
  const roundRef = db.collection('bettingRounds').doc(roundId);

  await db.runTransaction(async (transaction: any) => {
    const roundDoc = await transaction.get(roundRef);
    if (!roundDoc.exists) throw new Error("Betting round not found.");
    const roundData = roundDoc.data() as BettingRound;

    if (roundData.status === BettingRoundStatus.RESULT_UPDATED) throw new Error("Result already updated for this round.");

    transaction.update(roundRef, {
      status: BettingRoundStatus.RESULT_UPDATED,
      winningTeam: winningTeam,
    });

    for (const bet of roundData.bets) {
      const userRef = db.collection('users').doc(bet.userId);
      let pointsToAddBack = 0;
      let incrementWins = false;

      if (winningTeam === MatchResultTeam.DRAW) {
        pointsToAddBack = bet.pointsBet; // Return stake
      } else {
        const betWon = (bet.selectedTeam === BetTeamSelection.HOME && winningTeam === MatchResultTeam.HOME_WIN) ||
                       (bet.selectedTeam === BetTeamSelection.AWAY && winningTeam === MatchResultTeam.AWAY_WIN);
        if (betWon) {
          pointsToAddBack = bet.pointsBet * 2; // Return stake + winnings
          incrementWins = true;
        }
        // If loss, pointsToAddBack remains 0 (points already deducted)
      }

      if (pointsToAddBack > 0) {
        transaction.update(userRef, { points: window.firebase.firestore.FieldValue.increment(pointsToAddBack) });
      }
      if (incrementWins) {
        transaction.update(userRef, { winsCount: window.firebase.firestore.FieldValue.increment(1) });
      }
    }
  });

  const updatedRoundDoc = await roundRef.get();
  return mapFirestoreTimestampToDate(updatedRoundDoc.data());
};


export const getFirebaseLeaderboardEntries = async (): Promise<LeaderboardEntry[]> => {
  if (!db) {
    console.warn("Firestore not initialized. Cannot fetch Firebase leaderboard.");
    return [];
  }
  try {
    const usersSnapshot = await db.collection('users').orderBy('points', 'desc').limit(100).get(); // Limit for performance
    const leaderboardEntries: LeaderboardEntry[] = [];
    usersSnapshot.forEach((doc: any) => {
      const userData = doc.data() as User;
      leaderboardEntries.push({
        userId: userData.id,
        userName: userData.name,
        avatarUrl: userData.avatarUrl,
        points: userData.points,
        betsMade: userData.betsMadeCount || 0, // Use new field
        wins: userData.winsCount || 0,         // Use new field
      });
    });
    return leaderboardEntries;
  } catch (error) {
    console.error("Error fetching Firebase leaderboard entries:", error);
    return [];
  }
};
