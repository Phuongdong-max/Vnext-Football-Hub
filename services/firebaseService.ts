import { firebaseConfig } from '../firebaseConfig';
import { User, UserRole, LeaderboardEntry, BettingRound, FootballMatch, Bet, BetTeamSelection, MatchResultTeam, BettingRoundStatus, TeamDivisionData, Tournament } from '../types';
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
      console.log("Firebase initialized successfully");
      return true;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      alert("Could not initialize Firebase. Please check your firebaseConfig.ts and Firebase project setup.");
      return false;
    }
  } else if (window.firebase.apps && window.firebase.apps.length > 0) {
    app = window.firebase.app();
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
  return auth.onAuthStateChanged(async (firebaseUserFromSdk: any) => {
    console.log("[AuthService] Raw SDK user from onAuthStateChanged:", firebaseUserFromSdk);
    
    if (firebaseUserFromSdk) {
      // Robust check for UID existence and type
      if (typeof firebaseUserFromSdk.uid === 'string' && firebaseUserFromSdk.uid.length > 0) {
        console.log("[AuthService] SDK user has valid UID:", firebaseUserFromSdk.uid);
        try {
          const appUser = await findOrCreateUserProfile(firebaseUserFromSdk);
          callback(appUser);
        } catch (error) {
          console.error("[AuthService] Error in findOrCreateUserProfile:", error);
          callback(null); // Propagate error as a null user state
        }
      } else {
        console.error("[AuthService] SDK user received from onAuthStateChanged is missing a valid UID.", 
                      "UID type:", typeof firebaseUserFromSdk.uid, 
                      "UID value:", firebaseUserFromSdk.uid,
                      "Full SDK user object:", firebaseUserFromSdk);
        callback(null); // Treat as an invalid/error state
      }
    } else {
      console.log("[AuthService] No SDK user (logged out).");
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

export const findOrCreateUserProfile = async (firebaseUserFromSdk: any): Promise<User> => {
  if (!db) {
    console.error("Firestore not initialized for findOrCreateUserProfile.");
    throw new Error("Firestore not initialized.");
  }

  // This check is crucial and now more descriptive if it fails.
  if (!firebaseUserFromSdk || typeof firebaseUserFromSdk.uid !== 'string' || firebaseUserFromSdk.uid.length === 0) {
    console.error(
      "findOrCreateUserProfile called with invalid firebaseUserFromSdk or missing/empty UID.",
      "firebaseUserFromSdk:", firebaseUserFromSdk,
      "UID type:", typeof firebaseUserFromSdk?.uid,
      "UID value:", firebaseUserFromSdk?.uid
    );
    throw new Error("Cannot process user profile: Firebase user from SDK is invalid or UID is missing/empty.");
  }

  const uid = firebaseUserFromSdk.uid; // uid is now confirmed to be a valid string
  const userRef = db.collection('users').doc(uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    console.log(`[AuthService] Creating new user profile for UID: ${uid}`);
    const newUserProfile: User = {
      id: uid, // Use the validated uid
      name: firebaseUserFromSdk.displayName || 'Anonymous User',
      email: firebaseUserFromSdk.email || '',
      avatarUrl: firebaseUserFromSdk.photoURL || null,
      role: UserRole.MEMBER,
      points: INITIAL_USER_POINTS,
      betsMadeCount: 0,
      winsCount: 0,
    };
    await userRef.set(newUserProfile);
    return newUserProfile;
  } else {
    console.log(`[AuthService] Found existing user profile for UID: ${uid}`);
    const data = doc.data();
    return {
      id: uid, // Use the validated uid
      name: data.name || firebaseUserFromSdk.displayName || 'Anonymous User',
      email: data.email || firebaseUserFromSdk.email || '',
      avatarUrl: data.avatarUrl || firebaseUserFromSdk.photoURL || null,
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
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name || 'Anonymous User',
            email: data.email || '',
            avatarUrl: data.avatarUrl || null,
            role: data.role || UserRole.MEMBER,
            points: typeof data.points === 'number' ? data.points : INITIAL_USER_POINTS,
            betsMadeCount: typeof data.betsMadeCount === 'number' ? data.betsMadeCount : 0,
            winsCount: typeof data.winsCount === 'number' ? data.winsCount : 0,
        } as User;
    }
    return null;
};

export const getAllAppUsers = async (): Promise<User[]> => {
    if (!db) {
        console.warn("Firestore not initialized.");
        return [];
    }
    try {
        const usersSnapshot = await db.collection('users').orderBy('name', 'asc').get();
        return usersSnapshot.docs.map((doc: any) => {
          const data = doc.data();
          return {
             id: doc.id,
            name: data.name || 'Anonymous User',
            email: data.email || '',
            avatarUrl: data.avatarUrl || null,
            role: data.role || UserRole.MEMBER,
            points: typeof data.points === 'number' ? data.points : INITIAL_USER_POINTS,
            betsMadeCount: typeof data.betsMadeCount === 'number' ? data.betsMadeCount : 0,
            winsCount: typeof data.winsCount === 'number' ? data.winsCount : 0,
          } as User
        });
    } catch (error) {
        console.error("Error fetching all users:", error);
        return [];
    }
};

// --- Betting Round Functions ---

export const createFirebaseBettingRound = async (match: FootballMatch, adminUserId: string): Promise<BettingRound> => {
  if (!db) throw new Error("Firestore not initialized.");
  
  const existingRoundQuery = await db.collection('bettingRounds').where('matchId', '==', match.id).limit(1).get();
  if (!existingRoundQuery.empty) {
    throw new Error("A betting round for this match already exists in Firebase.");
  }

  const newRoundRef = db.collection('bettingRounds').doc();
  const newRoundData: BettingRound = {
    id: newRoundRef.id,
    matchId: match.id,
    matchDetails: { 
        ...match,
        startTime: window.firebase.firestore.Timestamp.fromDate(new Date(match.startTime)),
    },
    status: BettingRoundStatus.OPEN,
    bets: [],
    bettorIds: [],
    createdBy: adminUserId,
    createdAt: window.firebase.firestore.Timestamp.now(),
  };
  await newRoundRef.set(newRoundData);
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
    timestamp: window.firebase.firestore.Timestamp.now(),
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

  return { ...newBet, timestamp: (newBet.timestamp as any).toDate() };
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
        pointsToAddBack = bet.pointsBet;
      } else {
        const betWon = (bet.selectedTeam === BetTeamSelection.HOME && winningTeam === MatchResultTeam.HOME_WIN) ||
                       (bet.selectedTeam === BetTeamSelection.AWAY && winningTeam === MatchResultTeam.AWAY_WIN);
        if (betWon) {
          pointsToAddBack = bet.pointsBet * 2;
          incrementWins = true;
        }
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
    const usersSnapshot = await db.collection('users').orderBy('points', 'desc').limit(100).get();
    const leaderboardEntries: LeaderboardEntry[] = [];
    usersSnapshot.forEach((doc: any) => {
      const userData = doc.data() as User;
      leaderboardEntries.push({
        userId: userData.id,
        userName: userData.name,
        avatarUrl: userData.avatarUrl,
        points: userData.points,
        betsMade: userData.betsMadeCount || 0,
        wins: userData.winsCount || 0,
      });
    });
    return leaderboardEntries;
  } catch (error) {
    console.error("Error fetching Firebase leaderboard entries:", error);
    return [];
  }
};


// --- Team Divider Functions ---

const TEAM_DIVIDER_COLLECTION = 'teamDivision';
const LATEST_DIVISION_DOC_ID = 'latest';

// Sets up a real-time listener for the team division data.
export const onTeamDivisionUpdate = (callback: (data: TeamDivisionData | null) => void): (() => void) => {
  if (!db) {
    console.error("Firestore not initialized for onTeamDivisionUpdate.");
    return () => {}; // Return an empty unsubscribe function
  }
  
  const docRef = db.collection(TEAM_DIVIDER_COLLECTION).doc(LATEST_DIVISION_DOC_ID);

  const unsubscribe = docRef.onSnapshot((doc: any) => {
    if (doc.exists) {
      const data = doc.data() as TeamDivisionData;
      // Convert timestamp if it exists
      if (data.lastUpdated && typeof data.lastUpdated.toDate === 'function') {
        data.lastUpdated = data.lastUpdated.toDate();
      }
      callback(data);
    } else {
      // If the document doesn't exist, provide a null or default state.
      callback(null);
    }
  }, (error: Error) => {
    console.error("Error listening to team division updates:", error);
    callback(null); // Propagate error as null state
  });

  return unsubscribe;
};

// Updates the team division document in Firestore.
export const updateTeamDivision = async (dataToSave: Omit<TeamDivisionData, 'id' | 'lastUpdated' | 'updatedBy'>, user: User | null): Promise<void> => {
  if (!db) {
    throw new Error("Firestore not initialized.");
  }

  const docRef = db.collection(TEAM_DIVIDER_COLLECTION).doc(LATEST_DIVISION_DOC_ID);
  
  const payload: Partial<TeamDivisionData> = {
    ...dataToSave,
    lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp(),
    updatedBy: user ? { id: user.id, name: user.name } : { id: 'anonymous', name: 'Anonymous' },
  };

  try {
    // .set with merge: true will create the document if it doesn't exist, or update it if it does.
    await docRef.set(payload, { merge: true });
  } catch (error) {
    console.error("Error updating team division data:", error);
    throw new Error("Failed to save team division data.");
  }
};

// --- Tournament Functions ---

export const onTournamentUpdate = (
    tournamentId: string,
    callback: (data: Tournament | null) => void
): (() => void) => {
    if (!db) {
        console.error("Firestore not initialized for onTournamentUpdate.");
        return () => {};
    }

    const docRef = db.collection('tournaments').doc(tournamentId);

    const unsubscribe = docRef.onSnapshot((doc: any) => {
        if (doc.exists) {
            const data = doc.data() as Tournament;
            // Convert timestamps
            if (data.lastUpdated && typeof data.lastUpdated.toDate === 'function') {
                data.lastUpdated = data.lastUpdated.toDate();
            }
            if (data.schedule) {
                data.schedule = data.schedule.map(match => ({
                    ...match,
                    date: match.date && (match.date as any).toDate ? (match.date as any).toDate() : null,
                }));
            }
            callback(data);
        } else {
            callback(null);
        }
    }, (error: Error) => {
        console.error(`Error listening to tournament ${tournamentId}:`, error);
        callback(null);
    });

    return unsubscribe;
};

export const updateTournament = async (tournamentId: string, data: Partial<Tournament>, user: User | null): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");

    const docRef = db.collection('tournaments').doc(tournamentId);

    const payload: Partial<Tournament> = {
        ...data,
        lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: user ? { id: user.id, name: user.name } : { id: 'anonymous', name: 'Anonymous' },
    };
    
    // Convert Dates back to Timestamps for schedule
    if (payload.schedule) {
        payload.schedule = payload.schedule.map(match => ({
            ...match,
            // Only convert if it's a Date object, not already a timestamp
            date: match.date && match.date instanceof Date ? window.firebase.firestore.Timestamp.fromDate(match.date) : match.date,
        }));
    }

    try {
        await docRef.set(payload, { merge: true });
    } catch (error) {
        console.error("Error updating tournament data:", error);
        throw error;
    }
};