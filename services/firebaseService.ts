
import { firebaseConfig } from '../firebaseConfig';
import { User, UserRole, LeaderboardEntry, BettingRound, FootballMatch, Bet, BetTeamSelection, MatchResultTeam, BettingRoundStatus } from '../types';
import { INITIAL_USER_POINTS } from '../constants';

// Declare Firebase types for global scope (since SDK is loaded via script tag)
// This namespace is for type annotations like `param: FirebaseGlob.auth.User`.
// It mirrors the structure of the v8/compat Firebase SDK.
declare namespace FirebaseGlob {
  namespace auth {
    interface Auth {
      currentUser: FirebaseGlob.auth.User | null; // Added currentUser
      onAuthStateChanged(callback: (user: User | null) => void): () => void;
      signInWithPopup(provider: GoogleAuthProvider): Promise<UserCredential>;
      signOut(): Promise<void>;
      // Add other methods if used
    }

    interface User {
      uid: string;
      displayName: string | null;
      email: string | null;
      photoURL: string | null;
      getIdToken(forceRefresh?: boolean): Promise<string>; // Ensure getIdToken is defined
      // Add other User properties if used from firebaseUser
    }

    interface UserCredential {
      user: User | null;
      // Add other properties if needed
    }

    // Provider class
    class GoogleAuthProvider {
      // No methods/properties needed for instantiation typically
    }
  }

  namespace firestore {
    interface Firestore {
      collection(collectionPath: string): CollectionReference;
      doc(documentPath: string): DocumentReference;
      runTransaction<T>(updateFunction: (transaction: Transaction) => Promise<T>): Promise<T>;
    }

    interface DocumentReference {
      id: string;
      get(): Promise<DocumentSnapshot>;
      set(data: any): Promise<void>; 
      update(data: any): Promise<void>;
    }

    interface CollectionReference { // extends Query
      id: string;
      doc(documentPath?: string): DocumentReference;
      where(fieldPath: string | FieldPath, opStr: WhereFilterOp, value: any): Query;
      orderBy(fieldPath: string | FieldPath, directionStr?: OrderByDirection): Query;
      limit(limit: number): Query;
      get(): Promise<QuerySnapshot>;
    }
    
    interface Query {
       where(fieldPath: string | FieldPath, opStr: WhereFilterOp, value: any): Query;
       orderBy(fieldPath: string | FieldPath, directionStr?: OrderByDirection): Query;
       limit(limit: number): Query;
       get(): Promise<QuerySnapshot>;
    }

    interface DocumentSnapshot {
      id: string;
      exists: boolean;
      data(): any | undefined; 
    }

    interface QuerySnapshot {
      docs: DocumentSnapshot[]; 
      empty: boolean;
      forEach(callback: (result: DocumentSnapshot) => void, thisArg?: any): void;
    }
    
    interface FieldPath { /* Minimal definition, expand if needed */ }
    type WhereFilterOp = '==' | '<' | '<=' | '>' | '>=' | '!=' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    type OrderByDirection = 'desc' | 'asc';

    interface Transaction {
      get(documentRef: DocumentReference): Promise<DocumentSnapshot>;
      update(documentRef: DocumentReference, data: any): Transaction; 
    }

    const FieldValue: {
      serverTimestamp: () => any; 
      delete: () => any; 
      arrayUnion: (...elements: any[]) => any; 
      arrayRemove: (...elements: any[]) => any; 
      increment: (n: number) => any; 
    };
    
    interface Timestamp {
      toDate(): Date;
    }
    const Timestamp: {
      now(): Timestamp;
      fromDate(date: Date): Timestamp;
    };
  }
}

declare global {
  interface Window {
    firebase: {
      initializeApp: (config: any) => any; // Returns FirebaseApp
      app: (name?: string) => any; // Returns FirebaseApp
      apps: any[];
      auth: {
        (): FirebaseGlob.auth.Auth;
        GoogleAuthProvider: new () => FirebaseGlob.auth.GoogleAuthProvider;
      };
      firestore: {
        (): FirebaseGlob.firestore.Firestore;
        Timestamp: typeof FirebaseGlob.firestore.Timestamp;
        FieldValue: typeof FirebaseGlob.firestore.FieldValue;
      };
    };
  }
}
declare var firebase: Window['firebase']; // Make firebase directly available

let app: any = null; // Firebase App instance
let auth: FirebaseGlob.auth.Auth | null = null; // Firebase Auth instance
let db: FirebaseGlob.firestore.Firestore | null = null;  // Firebase Firestore instance

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
    return () => {}; 
  }
  return auth.onAuthStateChanged(async (firebaseUser: FirebaseGlob.auth.User | null) => {
    if (firebaseUser) {
      const appUser = await findOrCreateUserProfile(firebaseUser);
      callback(appUser);
    } else {
      callback(null);
    }
  });
};

export const signInWithGoogle = async (): Promise<FirebaseGlob.auth.User | null> => {
  if (!auth) {
    console.error("Firebase Auth not initialized.");
    throw new Error("Firebase Auth not initialized.");
  }
  const provider = new window.firebase.auth.GoogleAuthProvider();
  try {
    const result: FirebaseGlob.auth.UserCredential = await auth.signInWithPopup(provider);
    return result.user; 
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

export const findOrCreateUserProfile = async (firebaseUser: FirebaseGlob.auth.User): Promise<User> => {
  if (!db) {
    console.error("Firestore not initialized.");
    throw new Error("Firestore not initialized.");
  }

  if (!firebaseUser.uid) {
      console.error("Firebase user object is missing UID in findOrCreateUserProfile.", firebaseUser);
      throw new Error("Firebase user is invalid (missing UID).");
  }

  const userRef = db.collection('users').doc(firebaseUser.uid);
  const doc = await userRef.get();

  if (!doc.exists) {
    const newUserProfile: User = {
      id: firebaseUser.uid, 
      name: firebaseUser.displayName || 'Anonymous User',
      email: firebaseUser.email || '',
      avatarUrl: firebaseUser.photoURL || undefined,
      role: UserRole.MEMBER, 
      points: INITIAL_USER_POINTS,
      betsMadeCount: 0,
      winsCount: 0,
    };
    await userRef.set(newUserProfile);
    return newUserProfile;
  } else {
    const data = doc.data() as any; // data() returns any with current typings
    return {
      id: doc.id, 
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
        const data = doc.data() as any; // data() returns any
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
  
  const existingRoundQuery = await db.collection('bettingRounds').where('matchId', '==', match.id).limit(1).get();
  if (!existingRoundQuery.empty) {
    throw new Error("A betting round for this match already exists in Firebase.");
  }

  const newRoundRef = db.collection('bettingRounds').doc();
  
  // Construct matchDetails carefully to avoid undefined values
  const matchDetailsForFirestore: any = {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    startTime: window.firebase.firestore.Timestamp.fromDate(new Date(match.startTime)),
    league: match.league,
  };
  if (match.leagueCode !== undefined) {
    matchDetailsForFirestore.leagueCode = match.leagueCode;
  }
  if (match.status !== undefined) {
    matchDetailsForFirestore.status = match.status;
  }

  const newRoundDataToSet = { 
    id: newRoundRef.id,
    matchId: match.id,
    matchDetails: matchDetailsForFirestore,
    status: BettingRoundStatus.OPEN,
    bets: [],
    bettorIds: [],
    createdBy: adminUserId,
    createdAt: window.firebase.firestore.Timestamp.now(),
  };
  await newRoundRef.set(newRoundDataToSet);
  
  // Return BettingRound with Date objects
  return {
      ...newRoundDataToSet,
      matchDetails: {
          ...newRoundDataToSet.matchDetails,
          startTime: (newRoundDataToSet.matchDetails.startTime as FirebaseGlob.firestore.Timestamp).toDate(),
      },
      createdAt: (newRoundDataToSet.createdAt as FirebaseGlob.firestore.Timestamp).toDate(),
  } as BettingRound;
};

const mapFirestoreTimestampToDate = (roundDataInput: any): BettingRound => {
  if (!roundDataInput) return roundDataInput; 
  const data = typeof roundDataInput.data === 'function' ? roundDataInput.data() : roundDataInput; 

  const mappedMatchDetails = {
    ...data.matchDetails,
    startTime: data.matchDetails.startTime?.toDate ? data.matchDetails.startTime.toDate() : new Date(data.matchDetails.startTime),
  };

  const mappedBets = (data.bets || []).map((bet: any) => ({
    ...bet,
    timestamp: bet.timestamp?.toDate ? bet.timestamp.toDate() : new Date(bet.timestamp),
  }));

  return {
    ...data,
    matchDetails: mappedMatchDetails,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    bets: mappedBets,
  } as BettingRound;
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
  return querySnapshot.docs.map((doc: FirebaseGlob.firestore.DocumentSnapshot) => mapFirestoreTimestampToDate(doc.data()));
};

export const getFirebaseOpenBettingRounds = async (): Promise<BettingRound[]> => {
  if (!db) throw new Error("Firestore not initialized.");
  const querySnapshot = await db.collection('bettingRounds')
                              .where('status', '==', BettingRoundStatus.OPEN)
                              .orderBy('matchDetails.startTime', 'asc')
                              .get();
  return querySnapshot.docs.map((doc: FirebaseGlob.firestore.DocumentSnapshot) => mapFirestoreTimestampToDate(doc.data()));
};

export const getFirebaseClosedBettingRoundsForMember = async (userId: string): Promise<BettingRound[]> => {
  if (!db) throw new Error("Firestore not initialized.");
  const querySnapshot = await db.collection('bettingRounds')
                              .where('bettorIds', 'array-contains', userId)
                              .where('status', 'in', [BettingRoundStatus.CLOSED, BettingRoundStatus.RESULT_UPDATED])
                              .orderBy('matchDetails.startTime', 'desc')
                              .get();
  return querySnapshot.docs.map((doc: FirebaseGlob.firestore.DocumentSnapshot) => mapFirestoreTimestampToDate(doc.data()));
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

  const newBetDataForFirestore = { 
    userId,
    userName,
    roundId,
    selectedTeam,
    pointsBet,
    timestamp: window.firebase.firestore.Timestamp.now(), 
  };

  await db.runTransaction(async (transaction: FirebaseGlob.firestore.Transaction) => {
    const roundDoc = await transaction.get(roundRef);
    if (!roundDoc.exists) throw new Error("Betting round not found.");
    const roundData = roundDoc.data() as BettingRound; // Assuming data structure matches

    if (roundData.status !== BettingRoundStatus.OPEN) throw new Error("This round is not open for betting.");
    if ((roundData.bets || []).some(b => b.userId === userId)) throw new Error("You have already placed a bet on this round.");

    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists) throw new Error("User not found.");
    const userData = userDoc.data() as User;

    if (userData.points < pointsBet) throw new Error("Insufficient points.");

    transaction.update(roundRef, {
      bets: window.firebase.firestore.FieldValue.arrayUnion(newBetDataForFirestore),
      bettorIds: window.firebase.firestore.FieldValue.arrayUnion(userId),
    });
    transaction.update(userRef, {
      points: window.firebase.firestore.FieldValue.increment(-pointsBet),
      betsMadeCount: window.firebase.firestore.FieldValue.increment(1),
    });
  });
  
  return { 
    ...newBetDataForFirestore, 
    timestamp: (newBetDataForFirestore.timestamp as FirebaseGlob.firestore.Timestamp).toDate() 
  } as Bet;
};

export const updateFirebaseMatchResult = async (roundId: string, winningTeam: MatchResultTeam): Promise<BettingRound> => {
  if (!db) throw new Error("Firestore not initialized.");
  const roundRef = db.collection('bettingRounds').doc(roundId);

  await db.runTransaction(async (transaction: FirebaseGlob.firestore.Transaction) => {
    const roundDoc = await transaction.get(roundRef);
    if (!roundDoc.exists) throw new Error("Betting round not found.");
    const roundData = mapFirestoreTimestampToDate(roundDoc.data()); // Get with Dates

    if (roundData.status === BettingRoundStatus.RESULT_UPDATED) throw new Error("Result already updated for this round.");

    transaction.update(roundRef, {
      status: BettingRoundStatus.RESULT_UPDATED,
      winningTeam: winningTeam,
    });

    for (const bet of (roundData.bets || [])) {
      const userRef = db!.collection('users').doc(bet.userId); // db is checked, so ! is safe
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
    usersSnapshot.forEach((doc: FirebaseGlob.firestore.DocumentSnapshot) => {
      const userData = doc.data() as User; 
      leaderboardEntries.push({
        userId: userData.id || doc.id, 
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
