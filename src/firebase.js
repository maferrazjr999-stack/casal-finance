import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, enableNetwork } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDaxH9O0c2e--Jz5uufwBgilDR9rRMvAXw",
  authDomain: "casal-finance-a2bde.firebaseapp.com",
  projectId: "casal-finance-a2bde",
  storageBucket: "casal-finance-a2bde.firebasestorage.app",
  messagingSenderId: "1021748440884",
  appId: "1:1021748440884:web:aae9687e520b346d987f61",
};

let app, db, auth;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  enableNetwork(db).catch(() => {});
} catch (e) {
  console.warn("Firebase init failed:", e);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

const ALLOWED_EMAILS = [
  "maferrazjr999@gmail.com",
  "ghisleinebernardon@gmail.com"
];

export function isEmailAllowed(email) {
  if (!email) return false;
  return ALLOWED_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
}

const provider = new GoogleAuthProvider();

export function onAuthChange(callback) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (user) => {
    if (user && !isEmailAllowed(user.email)) {
      callback(null);
      logout().then(() => {
        alert("Acesso não autorizado. Este app é apenas para usuários cadastrados.");
      });
      return;
    }
    callback(user);
  });
}

export async function loginWithGoogle() {
  if (!auth) return;
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/popup-closed-by-user" ||
      err.code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(auth, provider);
    } else {
      console.error("Login error:", err.code, err.message);
      throw err;
    }
  }
}

export async function handleRedirectResult() {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (e) {
    console.warn("Redirect result error:", e);
    return null;
  }
}

export async function logout() {
  if (!auth) return;
  await signOut(auth);
}

// ─── Firestore — dados compartilhados do casal ────────────────────────────────
// Um único documento para o casal inteiro — qualquer conta logada acessa

const STATE_DOC = "state/main";

export function subscribeState(callback) {
  if (!db) {
    console.warn("Firestore não inicializado");
    return () => {};
  }

  const unsub = onSnapshot(
    doc(db, STATE_DOC),
    { includeMetadataChanges: false },
    (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error("Firebase sync error:", error.code, error.message);
      callback(null);
    }
  );

  return unsub;
}

export async function saveState(state) {
  if (!db) return;
  try {
    await setDoc(
      doc(db, STATE_DOC),
      {
        users: state.users,
        transactions: state.transactions,
        onboarded: state.onboarded,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error("Firebase save error:", e.code, e.message);
  }
}
