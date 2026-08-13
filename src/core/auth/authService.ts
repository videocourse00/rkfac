import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  updateEmail,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, dbFirestore } from '../../lib/firebase';
import { db } from '../../db/dexie';
import type { User as AppUserModel } from '../../types';

export interface AuthSession {
  uid: string;
  phoneNumber: string;
  fullName: string;
  familyId: string;
  email: string;
  loggedInAt: string;
}

const LOCAL_SESSION_KEY = 'family_accounting_auth_session';

/**
 * Clean and normalize phone numbers (e.g. "01712-345678" -> "8801712345678")
 */
export function cleanPhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 11) {
    return `880${digits.substring(1)}`;
  }
  return digits;
}

/**
 * Converts cleaned phone number into a valid internal Firebase Auth email address
 */
export function phoneToAuthEmail(cleanPhone: string): string {
  return `phone_${cleanPhone}@familyapp.internal`;
}

/**
 * Retrieves the cached local authentication session for offline operation
 */
export function getLocalAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch (err) {
    return null;
  }
}

/**
 * Saves authentication session to local storage and Dexie
 */
export async function saveLocalAuthSession(session: AuthSession): Promise<void> {
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));

  // Also persist in Dexie users table
  const userRecord: AppUserModel = {
    id: session.uid,
    email: session.email,
    full_name: session.fullName,
    phone_number: session.phoneNumber,
    auth_provider: 'LOCAL',
    sync_status: 'SYNCED',
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db.users.put(userRecord);
}

/**
 * Clears local session and signs out
 */
export async function logoutUser(): Promise<void> {
  localStorage.removeItem(LOCAL_SESSION_KEY);
  if (navigator.onLine) {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signout warning:', err);
    }
  }
}

/**
 * Sign Up using Mobile Number and Password (Requires Internet)
 */
export async function signUpWithMobile(
  rawPhone: string,
  password: string,
  fullName: string,
  requestedFamilyId?: string
): Promise<AuthSession> {
  if (!navigator.onLine) {
    throw new Error('Internet connection is required for Sign Up.');
  }

  const phone = cleanPhoneNumber(rawPhone);
  if (!phone || phone.length < 8) {
    throw new Error('Please enter a valid mobile number.');
  }

  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const authEmail = phoneToAuthEmail(phone);

  // Check if phone number already exists in Firestore users
  const q = query(collection(dbFirestore, 'users'), where('phoneNumber', '==', phone));
  const existingDocs = await getDocs(q);
  if (!existingDocs.empty) {
    throw new Error('This mobile number is already registered. Please login instead.');
  }

  // Create Firebase Auth User
  const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
  const uid = cred.user.uid;
  const familyId = requestedFamilyId || `fam_${uid}`;

  // Create User Document in Firestore
  const userDocData = {
    uid,
    phoneNumber: phone,
    fullName,
    familyId,
    email: authEmail,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(dbFirestore, 'users', uid), userDocData);

  const session: AuthSession = {
    uid,
    phoneNumber: phone,
    fullName,
    familyId,
    email: authEmail,
    loggedInAt: new Date().toISOString(),
  };

  await saveLocalAuthSession(session);
  return session;
}

/**
 * Login using Mobile Number and Password (Requires Internet for First Auth or Device Switch)
 */
export async function loginWithMobile(rawPhone: string, password: string): Promise<AuthSession> {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone || phone.length < 8) {
    throw new Error('Please enter a valid mobile number.');
  }

  if (!password) {
    throw new Error('Please enter your password.');
  }

  const authEmail = phoneToAuthEmail(phone);

  // If Offline, check if local session exists matching this phone
  if (!navigator.onLine) {
    const local = getLocalAuthSession();
    if (local && local.phoneNumber === phone) {
      return local;
    }
    throw new Error('Internet connection is required for first-time authentication on this device.');
  }

  // Online Authentication via Firebase Auth
  const cred = await signInWithEmailAndPassword(auth, authEmail, password);
  const uid = cred.user.uid;

  // Retrieve user metadata from Firestore
  let familyId = `fam_${uid}`;
  let fullName = 'Family Member';

  const userDocRef = doc(dbFirestore, 'users', uid);
  const userSnap = await getDoc(userDocRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    familyId = data.familyId || familyId;
    fullName = data.fullName || fullName;
  } else {
    // Create doc if missing
    await setDoc(userDocRef, {
      uid,
      phoneNumber: phone,
      fullName,
      familyId,
      email: authEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  const session: AuthSession = {
    uid,
    phoneNumber: phone,
    fullName,
    familyId,
    email: authEmail,
    loggedInAt: new Date().toISOString(),
  };

  await saveLocalAuthSession(session);
  return session;
}

/**
 * Change Password (Requires Internet)
 */
export async function changeUserPassword(
  currentPhone: string,
  currentPass: string,
  newPass: string
): Promise<void> {
  if (!navigator.onLine) {
    throw new Error('Internet connection is required to change password.');
  }

  if (!newPass || newPass.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  // Ensure Firebase user is authenticated
  let currentUser = auth.currentUser;
  if (!currentUser) {
    const authEmail = phoneToAuthEmail(cleanPhoneNumber(currentPhone));
    const cred = await signInWithEmailAndPassword(auth, authEmail, currentPass);
    currentUser = cred.user;
  }

  await updatePassword(currentUser, newPass);
}

/**
 * Change Mobile Number (Requires Internet)
 */
export async function changeUserMobileNumber(
  session: AuthSession,
  currentPass: string,
  newRawPhone: string
): Promise<AuthSession> {
  if (!navigator.onLine) {
    throw new Error('Internet connection is required to change mobile number.');
  }

  const newPhone = cleanPhoneNumber(newRawPhone);
  if (!newPhone || newPhone.length < 8) {
    throw new Error('Please enter a valid new mobile number.');
  }

  if (newPhone === session.phoneNumber) {
    throw new Error('New mobile number must be different from current mobile number.');
  }

  // Check if new mobile number is taken in Firestore
  const q = query(collection(dbFirestore, 'users'), where('phoneNumber', '==', newPhone));
  const existingDocs = await getDocs(q);
  if (!existingDocs.empty) {
    throw new Error('The new mobile number is already registered to another account.');
  }

  // Re-authenticate Firebase user
  let currentUser = auth.currentUser;
  const currentEmail = phoneToAuthEmail(session.phoneNumber);
  if (!currentUser) {
    const cred = await signInWithEmailAndPassword(auth, currentEmail, currentPass);
    currentUser = cred.user;
  }

  const newEmail = phoneToAuthEmail(newPhone);
  await updateEmail(currentUser, newEmail);

  // Update Firestore User Document
  const userDocRef = doc(dbFirestore, 'users', session.uid);
  await updateDoc(userDocRef, {
    phoneNumber: newPhone,
    email: newEmail,
    updatedAt: new Date().toISOString(),
  });

  const updatedSession: AuthSession = {
    ...session,
    phoneNumber: newPhone,
    email: newEmail,
  };

  await saveLocalAuthSession(updatedSession);
  return updatedSession;
}
