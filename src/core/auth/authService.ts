import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword,
  updateEmail,
  signOut,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, dbFirestore } from '../../lib/firebase';
import { db } from '../../db/dexie';
import type { User as AppUserModel, FamilyProfile, FamilyMember } from '../../types';

export interface AuthSession {
  uid: string;
  phoneNumber: string;
  fullName: string;
  familyId: string;
  email: string;
  loggedInAt: string;
}

export interface StoredLocalUser {
  uid: string;
  phoneNumber: string;
  fullName: string;
  familyId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_SESSION_KEY = 'family_accounting_auth_session';
const LOCAL_REGISTRY_KEY = 'family_accounting_users_registry';

/**
 * Clean and normalize phone numbers (e.g. "01712-345678" -> "8801712345678" or "01677836677" -> "8801677836677")
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
 * Secure SHA-256 hash generator for passwords with app-specific salt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + '_rk_family_accounting_salt_2026');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('WebCrypto hash fallback used:', e);
  }

  // Fallback hash implementation if WebCrypto is unavailable
  let hash = 0;
  const str = password + '_rk_family_salt';
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}`;
}

/**
 * Retrieves all stored local users from the device
 */
function getLocalUsersRegistry(): Record<string, StoredLocalUser> {
  try {
    const raw = localStorage.getItem(LOCAL_REGISTRY_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

/**
 * Saves a user to the local device registry
 */
function saveLocalUserToRegistry(user: StoredLocalUser): void {
  try {
    const registry = getLocalUsersRegistry();
    registry[user.phoneNumber] = user;
    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(registry));
  } catch (err) {
    console.warn('Failed to save to local registry:', err);
  }
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
 * Ensures initial family profile and admin member exist in Dexie
 */
async function ensureInitialFamilyData(session: AuthSession): Promise<void> {
  try {
    const existingProfiles = await db.familyProfile.toArray();
    if (existingProfiles.length === 0) {
      const familyProfile: FamilyProfile = {
        id: session.familyId,
        family_name: session.fullName ? `${session.fullName} এর পরিবার` : 'পারিবারিক হিসাব',
        currency_symbol: '৳',
        currency_code: 'BDT',
        owner_user_id: session.uid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.familyProfile.put(familyProfile);

      const adminMember: FamilyMember = {
        id: `mem_${session.uid}`,
        family_id: session.familyId,
        user_id: session.uid,
        name: session.fullName || 'Family Admin',
        relation: 'Self',
        is_active: true,
        phone: session.phoneNumber,
        email: session.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.familyMembers.put(adminMember);
    }
  } catch (err) {
    console.warn('Initial family data check warning:', err);
  }
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
 * Helper to map Firebase Auth error codes to user-friendly bilingual error messages
 */
function mapAuthError(err: any, defaultMsg: string): string {
  const code = err?.code || '';
  const message = err?.message || '';

  if (code === 'auth/email-already-in-use' || message.includes('email-already-in-use')) {
    return 'এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট তৈরি করা আছে। দয়া করে লগইন করুন। (This mobile number is already registered. Please login instead.)';
  }
  if (
    code === 'auth/user-not-found' ||
    code === 'auth/wrong-password' ||
    code === 'auth/invalid-credential' ||
    code === 'auth/invalid-login-credentials' ||
    message.includes('invalid-credential') ||
    message.includes('wrong-password')
  ) {
    return 'মোবাইল নম্বর বা পাসওয়ার্ড সঠিক নয়। দয়া করে আবার চেষ্টা করুন। (Incorrect mobile number or password. Please try again.)';
  }
  if (code === 'auth/weak-password' || message.includes('weak-password')) {
    return 'পাসওয়ার্ডটি কমপক্ষে ৬ অক্ষরের হতে হবে। (Password must be at least 6 characters long.)';
  }
  if (code === 'auth/too-many-requests' || message.includes('too-many-requests')) {
    return 'অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর চেষ্টা করুন। (Too many attempts. Please try again later.)';
  }
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
    return 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। সংযোগ চেক করুন। (Network request failed. Please check your internet connection.)';
  }

  return message || defaultMsg;
}

/**
 * Sign Up using Mobile Number and Password (Works 100% Offline & Online with Cloud Sync)
 */
export async function signUpWithMobile(
  rawPhone: string,
  password: string,
  fullName: string,
  requestedFamilyId?: string
): Promise<AuthSession> {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone || phone.length < 8) {
    throw new Error('সঠিক মোবাইল নম্বর প্রবেশ করান। (Please enter a valid mobile number.)');
  }

  if (!password || password.length < 6) {
    throw new Error('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে। (Password must be at least 6 characters long.)');
  }

  const passHash = await hashPassword(password);
  const authEmail = phoneToAuthEmail(phone);
  const registry = getLocalUsersRegistry();

  // Check if already registered locally
  if (registry[phone]) {
    throw new Error('এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট রয়েছে। দয়া করে LOGIN করুন। (This mobile number is already registered. Please login.)');
  }

  let uid = `usr_${phone}`;
  const familyId = requestedFamilyId || `fam_${phone}`;

  // Try Firebase Auth if online (Gracefully fallback if not enabled or offline)
  if (navigator.onLine) {
    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail, password);
      uid = cred.user.uid;

      // Create User Document in Firestore
      try {
        await setDoc(doc(dbFirestore, 'users', uid), {
          uid,
          phoneNumber: phone,
          fullName: fullName.trim() || 'Family Admin',
          familyId,
          email: authEmail,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } catch (fsErr) {
        console.warn('Firestore user profile write warning:', fsErr);
      }
    } catch (fbErr: any) {
      console.warn('Firebase online sign up warning, proceeding with offline-first user creation:', fbErr);
      if (fbErr?.code === 'auth/email-already-in-use') {
        throw new Error('এই মোবাইল নম্বরটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট তৈরি করা আছে। দয়া করে লগইন করুন।');
      }
      // For operation-not-allowed or other cloud auth setup issues, fallback seamlessly to local user creation
    }
  }

  // Store user in local device registry
  const storedUser: StoredLocalUser = {
    uid,
    phoneNumber: phone,
    fullName: fullName.trim() || 'Family Admin',
    familyId,
    email: authEmail,
    passwordHash: passHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveLocalUserToRegistry(storedUser);

  const session: AuthSession = {
    uid,
    phoneNumber: phone,
    fullName: fullName.trim() || 'Family Admin',
    familyId,
    email: authEmail,
    loggedInAt: new Date().toISOString(),
  };

  await saveLocalAuthSession(session);
  await ensureInitialFamilyData(session);
  return session;
}

/**
 * Login using Mobile Number and Password (Works 100% Offline & Online)
 */
export async function loginWithMobile(rawPhone: string, password: string): Promise<AuthSession> {
  const phone = cleanPhoneNumber(rawPhone);
  if (!phone || phone.length < 8) {
    throw new Error('সঠিক মোবাইল নম্বর প্রবেশ করান। (Please enter a valid mobile number.)');
  }

  if (!password) {
    throw new Error('পাসওয়ার্ড প্রবেশ করান। (Please enter your password.)');
  }

  const passHash = await hashPassword(password);
  const authEmail = phoneToAuthEmail(phone);
  const registry = getLocalUsersRegistry();
  const localUser = registry[phone];

  // 1. Check if user credentials match local registry
  if (localUser) {
    if (localUser.passwordHash === passHash) {
      const session: AuthSession = {
        uid: localUser.uid,
        phoneNumber: localUser.phoneNumber,
        fullName: localUser.fullName,
        familyId: localUser.familyId,
        email: localUser.email,
        loggedInAt: new Date().toISOString(),
      };
      await saveLocalAuthSession(session);
      await ensureInitialFamilyData(session);

      // Attempt background cloud sign in if online
      if (navigator.onLine) {
        signInWithEmailAndPassword(auth, authEmail, password).catch(() => {});
      }

      return session;
    }
  }

  // 2. If not matched locally and online, try Firebase Auth
  if (navigator.onLine) {
    try {
      const cred = await signInWithEmailAndPassword(auth, authEmail, password);
      const uid = cred.user.uid;
      let familyId = `fam_${uid}`;
      let fullName = localUser?.fullName || 'Family Member';

      try {
        const userDocRef = doc(dbFirestore, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          familyId = data.familyId || familyId;
          fullName = data.fullName || fullName;
        }
      } catch (fsErr) {
        console.warn('Firestore profile load warning:', fsErr);
      }

      const storedUser: StoredLocalUser = {
        uid,
        phoneNumber: phone,
        fullName,
        familyId,
        email: authEmail,
        passwordHash: passHash,
        createdAt: localUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveLocalUserToRegistry(storedUser);

      const session: AuthSession = {
        uid,
        phoneNumber: phone,
        fullName,
        familyId,
        email: authEmail,
        loggedInAt: new Date().toISOString(),
      };

      await saveLocalAuthSession(session);
      await ensureInitialFamilyData(session);
      return session;
    } catch (fbErr: any) {
      if (localUser && localUser.passwordHash !== passHash) {
        throw new Error('পাসওয়ার্ডটি সঠিক নয়। দয়া করে আবার চেষ্টা করুন। (Incorrect password. Please try again.)');
      }
      throw new Error(mapAuthError(fbErr, 'লগইন ব্যর্থ হয়েছে। মোবাইল নম্বর ও পাসওয়ার্ড চেক করুন।'));
    }
  }

  // If offline and no matching local account
  if (localUser) {
    throw new Error('পাসওয়ার্ডটি সঠিক নয়। দয়া করে আবার চেষ্টা করুন। (Incorrect password. Please try again.)');
  }

  throw new Error('এই ডিভাইসে এই মোবাইল নম্বরের কোনো অ্যাকাউন্ট পাওয়া যায়নি। দয়া করে SIGN UP করুন।');
}

/**
 * Change Password (Supports Offline and Online)
 */
export async function changeUserPassword(
  currentPhone: string,
  currentPass: string,
  newPass: string
): Promise<void> {
  const phone = cleanPhoneNumber(currentPhone);
  if (!newPass || newPass.length < 6) {
    throw new Error('নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে। (New password must be at least 6 characters long.)');
  }

  const currentHash = await hashPassword(currentPass);
  const newHash = await hashPassword(newPass);
  const registry = getLocalUsersRegistry();
  const localUser = registry[phone];

  if (localUser && localUser.passwordHash !== currentHash) {
    throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়। (Current password is incorrect.)');
  }

  if (localUser) {
    localUser.passwordHash = newHash;
    localUser.updatedAt = new Date().toISOString();
    saveLocalUserToRegistry(localUser);
  }

  // Try Firebase update if online
  if (navigator.onLine) {
    try {
      let currentUser = auth.currentUser;
      const authEmail = phoneToAuthEmail(phone);
      if (!currentUser) {
        const cred = await signInWithEmailAndPassword(auth, authEmail, currentPass);
        currentUser = cred.user;
      }
      await updatePassword(currentUser, newPass);
    } catch (err) {
      console.warn('Firebase password update notice:', err);
    }
  }
}

/**
 * Change Mobile Number
 */
export async function changeUserMobileNumber(
  session: AuthSession,
  currentPass: string,
  newRawPhone: string
): Promise<AuthSession> {
  const newPhone = cleanPhoneNumber(newRawPhone);
  if (!newPhone || newPhone.length < 8) {
    throw new Error('সঠিক নতুন মোবাইল নম্বর প্রবেশ করান। (Please enter a valid new mobile number.)');
  }

  if (newPhone === session.phoneNumber) {
    throw new Error('নতুন মোবাইল নম্বরটি বর্তমান নম্বরের চেয়ে ভিন্ন হতে হবে।');
  }

  const currentHash = await hashPassword(currentPass);
  const registry = getLocalUsersRegistry();
  const localUser = registry[session.phoneNumber];

  if (localUser && localUser.passwordHash !== currentHash) {
    throw new Error('বর্তমান পাসওয়ার্ড সঠিক নয়। (Current password is incorrect.)');
  }

  const newEmail = phoneToAuthEmail(newPhone);

  if (localUser) {
    delete registry[session.phoneNumber];
    const updatedLocalUser: StoredLocalUser = {
      ...localUser,
      phoneNumber: newPhone,
      email: newEmail,
      updatedAt: new Date().toISOString(),
    };
    registry[newPhone] = updatedLocalUser;
    localStorage.setItem(LOCAL_REGISTRY_KEY, JSON.stringify(registry));
  }

  // Try Firebase update if online
  if (navigator.onLine) {
    try {
      let currentUser = auth.currentUser;
      const currentEmail = phoneToAuthEmail(session.phoneNumber);
      if (!currentUser) {
        const cred = await signInWithEmailAndPassword(auth, currentEmail, currentPass);
        currentUser = cred.user;
      }
      await updateEmail(currentUser, newEmail);
      await updateDoc(doc(dbFirestore, 'users', session.uid), {
        phoneNumber: newPhone,
        email: newEmail,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Firebase phone update notice:', err);
    }
  }

  const updatedSession: AuthSession = {
    ...session,
    phoneNumber: newPhone,
    email: newEmail,
  };

  await saveLocalAuthSession(updatedSession);
  return updatedSession;
}
