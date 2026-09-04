import { firebaseConfig } from '../firebaseConfig';
import { AppSettings, User, UserRole, LeaderboardEntry, BettingRound, FootballMatch, Bet, BetTeamSelection, MatchResultTeam, BettingRoundStatus, TeamDivisionData, Tournament, TournamentMatch, TournamentPlayer, TournamentTeam, TournamentSummary, TournamentStatus, PlayerSkills } from '../types';
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
      avatarUrl: data.avatarUrl ?? null,
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
            avatarUrl: data.avatarUrl ?? null,
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
            avatarUrl: data.avatarUrl ?? null,
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

// --- App Settings Functions ---

const APP_SETTINGS_COLLECTION = 'appSettings';
const GLOBAL_SETTINGS_DOC_ID = 'global';

// Sets up a real-time listener for global app settings.
export const onAppSettingsUpdate = (callback: (settings: AppSettings) => void): (() => void) => {
    if (!db) {
        console.error("Firestore not initialized for onAppSettingsUpdate.");
        return () => {};
    }

    const docRef = db.collection(APP_SETTINGS_COLLECTION).doc(GLOBAL_SETTINGS_DOC_ID);

    const unsubscribe = docRef.onSnapshot((doc: any) => {
        if (doc.exists) {
            callback(doc.data() as AppSettings);
        } else {
            // If the document doesn't exist, provide default settings.
            callback({ isBettingEnabled: true });
        }
    }, (error: Error) => {
        // Do NOT fall back to "enabled" here. This listener runs before sign-in
        // too, where the rules deny the read; forcing it on made the app show
        // betting features an admin had turned off.
        console.error("Error listening to app settings updates:", error);
    });

    return unsubscribe;
};

// Updates the global app settings document in Firestore.
export const updateAppSettings = async (settings: Partial<AppSettings>): Promise<void> => {
    if (!db) {
        throw new Error("Firestore not initialized.");
    }

    const docRef = db.collection(APP_SETTINGS_COLLECTION).doc(GLOBAL_SETTINGS_DOC_ID);

    try {
        // .set with merge: true will create or update.
        await docRef.set(settings, { merge: true });
    } catch (error) {
        console.error("Error updating app settings:", error);
        throw new Error("Failed to save app settings.");
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
// dataToSave is partial so the roster can be saved on its own, without a
// division attached (set(..., { merge: true }) leaves untouched fields alone).
export const updateTeamDivision = async (dataToSave: Partial<Pick<TeamDivisionData, 'seedPlayers' | 'dividedTeams' | 'fixedTeams' | 'fixedTeamsEnabled'>>, user: User | null): Promise<void> => {
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

// Sorted newest season first so the picker leads with the current one. Sorting
// happens client-side because `season` and `status` are new: documents written
// before this feature have neither, and an orderBy on a missing field drops
// those documents from the result entirely.
export const getAllTournaments = async (): Promise<TournamentSummary[]> => {
    if (!db) throw new Error("Firestore not initialized.");
    const tournamentsSnapshot = await db.collection('tournaments').get();
    const rows: TournamentSummary[] = tournamentsSnapshot.docs
        // The collection holds stray documents that only ever got {lastUpdated,
        // updatedBy} written to them - no name, no schedule, no standings. The
        // previous orderBy('name') query hid them by accident, because Firestore
        // drops documents that lack the ordered field. Filtering on purpose
        // keeps them out of the picker without touching the data.
        .filter((doc: any) => typeof doc.data().name === 'string' && doc.data().name.trim() !== '')
        .map((doc: any) => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name.trim(),
                season: typeof data.season === 'number' ? data.season : undefined,
                status: data.status === 'archived' ? 'archived' : 'active',
                startDate: data.startDate?.toDate ? data.startDate.toDate() : null,
                endDate: data.endDate?.toDate ? data.endDate.toDate() : null,
            };
        });

    return rows.sort((a, b) => {
        // Seasonless legacy tournaments sort last, then newest season first.
        const seasonDiff = (b.season ?? -Infinity) - (a.season ?? -Infinity);
        if (seasonDiff !== 0 && Number.isFinite(seasonDiff)) return seasonDiff;
        if (a.season === undefined && b.season !== undefined) return 1;
        if (b.season === undefined && a.season !== undefined) return -1;
        return a.name.localeCompare(b.name);
    });
};

export const createTournament = async (
    name: string,
    season: number,
    dates: { startDate: Date; endDate: Date | null },
    user: User
): Promise<string> => {
    if (!db) throw new Error("Firestore not initialized.");
    const newDocRef = db.collection('tournaments').doc();
    // Simplified Tournament object without players
    const newTournament: Omit<Tournament, 'players'> = {
        id: newDocRef.id,
        name: name,
        season,
        status: 'active',
        startDate: window.firebase.firestore.Timestamp.fromDate(dates.startDate),
        endDate: dates.endDate ? window.firebase.firestore.Timestamp.fromDate(dates.endDate) : null,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        teams: [],
        schedule: [],
        standings: [],
        lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: { id: user.id, name: user.name },
    };
    await newDocRef.set(newTournament);
    return newDocRef.id;
};

/**
 * Permanently removes a season. Archiving is the everyday action; this exists
 * for seasons created by mistake.
 *
 * Firestore does NOT cascade: deleting the tournament document leaves its
 * players subcollection behind as orphans that no query surfaces and nothing
 * cleans up, so the squad is removed first and the document last. Returns how
 * many player documents went with it.
 */
export const deleteTournament = async (tournamentId: string): Promise<number> => {
    if (!db) throw new Error("Firestore not initialized.");

    const playersRef = db.collection('tournaments').doc(tournamentId).collection(PLAYERS_SUBCOLLECTION);
    const snap = await playersRef.get();

    const CHUNK = 400; // Firestore caps a batch at 500 writes.
    for (let i = 0; i < snap.docs.length; i += CHUNK) {
        const batch = db.batch();
        for (const doc of snap.docs.slice(i, i + CHUNK)) batch.delete(doc.ref);
        await batch.commit();
    }

    await db.collection('tournaments').doc(tournamentId).delete();
    return snap.size;
};

// Archiving is the reversible everyday alternative to deleting: past seasons
// stay readable but are locked against edits.
export const setTournamentStatus = async (
    tournamentId: string,
    status: TournamentStatus,
    user: User | null
): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    await db.collection('tournaments').doc(tournamentId).update({
        status,
        lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: user ? { id: user.id, name: user.name } : { id: 'anonymous', name: 'Anonymous' },
    });
};


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
            const data = doc.data();
            // **FIX**: Explicitly combine the document ID with its data.
            const tournamentData: Tournament = {
                id: doc.id,
                ...data,
            } as Tournament;

            if (tournamentData.lastUpdated && typeof tournamentData.lastUpdated.toDate === 'function') {
                tournamentData.lastUpdated = tournamentData.lastUpdated.toDate();
            }
            for (const key of ['startDate', 'endDate'] as const) {
                const value = tournamentData[key];
                tournamentData[key] = value && typeof value.toDate === 'function' ? value.toDate() : (value ?? null);
            }
            if (tournamentData.schedule) {
                tournamentData.schedule = tournamentData.schedule.map(match => ({
                    ...match,
                    date: match.date && (match.date as any).toDate ? (match.date as any).toDate() : null,
                    homeTeamScore: match.homeTeamScore ?? null,
                    awayTeamScore: match.awayTeamScore ?? null,
                }));
            }
            callback(tournamentData);
        } else {
            callback(null);
        }
    }, (error: Error) => {
        console.error(`[FirebaseService] Error listening to tournament ${tournamentId}:`, error);
        callback(null);
    });

    return unsubscribe;
};

export const updateTournament = async (tournamentId: string, data: Partial<Tournament>, user: User | null): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");

    const docRef = db.collection('tournaments').doc(tournamentId);

    const payload: any = { // Use 'any' to easily accommodate FieldValue.delete()
        ...data,
        lastUpdated: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: user ? { id: user.id, name: user.name } : { id: 'anonymous', name: 'Anonymous' },
    };
    
    if (payload.schedule && Array.isArray(payload.schedule)) {
        payload.schedule = payload.schedule.map((match: TournamentMatch) => ({
            ...match,
            // Convert Date objects to Firestore Timestamps before saving
            date: match.date && match.date instanceof Date ? window.firebase.firestore.Timestamp.fromDate(match.date) : match.date,
        }));
    }
    
    try {
        // The issue was here. Using `update()` is the correct way to handle FieldValue.delete()
        // and reliably triggers listeners for field removals. `set` with merge does not.
        await docRef.update(payload);
    } catch (error) {
        console.error("[FirebaseService] Error updating tournament data in Firestore:", error);
        throw error;
    }
};

// --- Per-season squad management ---
// Squads used to live in one shared `globalPlayers` collection, so deleting a
// player who had left the club also blanked them out of every past season's
// teams and top-scorer list. Each season now owns its own roster at
// tournaments/{id}/players, keeping document ids so existing
// teams[].members[].playerId references still resolve.
const PLAYERS_SUBCOLLECTION = 'players';

const playersCollectionFor = (tournamentId: string) =>
    db.collection('tournaments').doc(tournamentId).collection(PLAYERS_SUBCOLLECTION);

export const onAllPlayersUpdate = (
  tournamentId: string,
  callback: (data: TournamentPlayer[]) => void
): (() => void) => {
  if (!db || !tournamentId) return () => {};
  const collectionRef = playersCollectionFor(tournamentId).orderBy('name', 'asc');
  const unsubscribe = collectionRef.onSnapshot((querySnapshot: any) => {
    const players = querySnapshot.docs.map((doc: any) => doc.data() as TournamentPlayer);
    callback(players);
  }, (error: Error) => {
    console.error("Error listening to season squad updates:", error);
    callback([]);
  });
  return unsubscribe;
};

export const addPlayer = async (
  tournamentId: string,
  playerData: Omit<TournamentPlayer, 'id'>
): Promise<TournamentPlayer> => {
    if (!db) throw new Error("Firestore not initialized.");
    if (!tournamentId) throw new Error("No season selected.");
    const newPlayerRef = playersCollectionFor(tournamentId).doc();
    const defaultSkills: PlayerSkills = {
      speed: 50, shooting: 50, passing: 50,
      dribbling: 50, defending: 50, physical: 50
    };
    const newPlayer: TournamentPlayer = {
        id: newPlayerRef.id,
        ...playerData,
        skills: playerData.skills || defaultSkills,
    };
    await newPlayerRef.set(newPlayer);
    return newPlayer;
};

export const updatePlayer = async (
  tournamentId: string,
  playerId: string,
  data: Partial<Omit<TournamentPlayer, 'id'>>
): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    if (!tournamentId) throw new Error("No season selected.");
    const playerRef = playersCollectionFor(tournamentId).doc(playerId);

    // To handle nested objects like `skills`, we need to use dot notation
    // if we want to update individual fields.
    const flattenedData: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(data)) {
        if (key === 'skills' && typeof value === 'object' && value !== null) {
            for (const [skillKey, skillValue] of Object.entries(value)) {
                flattenedData[`skills.${skillKey}`] = skillValue;
            }
        } else {
            flattenedData[key] = value;
        }
    }

    await playerRef.update(flattenedData);
};


export const deletePlayer = async (tournamentId: string, playerId: string): Promise<void> => {
    if (!db) throw new Error("Firestore not initialized.");
    if (!tournamentId) throw new Error("No season selected.");
    await playersCollectionFor(tournamentId).doc(playerId).delete();
    // Note: This does not perform a cascading delete from teams for simplicity.
    // The UI will handle rendering teams with missing player references.
};

// Copies a squad into a season, preserving ids. Used to seed a new season from
// a previous one and by the one-off migration off `globalPlayers`.
/**
 * A one-off read of another season's squad, for importing from it. The live
 * listener is deliberately not reused: this is a snapshot to choose from, not
 * something the page should keep watching.
 */
export const getPlayersOfTournament = async (
  tournamentId: string
): Promise<TournamentPlayer[]> => {
    if (!db) throw new Error("Firestore not initialized.");
    if (!tournamentId) return [];
    const snapshot = await playersCollectionFor(tournamentId).orderBy('name', 'asc').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as TournamentPlayer));
};

export const copyPlayersIntoTournament = async (
  tournamentId: string,
  players: TournamentPlayer[]
): Promise<number> => {
    if (!db) throw new Error("Firestore not initialized.");
    if (!tournamentId) throw new Error("No season selected.");
    if (!players || players.length === 0) return 0;

    // Firestore caps a batch at 500 writes.
    const CHUNK = 400;
    let written = 0;
    for (let i = 0; i < players.length; i += CHUNK) {
        const batch = db.batch();
        for (const player of players.slice(i, i + CHUNK)) {
            batch.set(playersCollectionFor(tournamentId).doc(player.id), player);
        }
        await batch.commit();
        written += Math.min(CHUNK, players.length - i);
    }
    return written;
};

