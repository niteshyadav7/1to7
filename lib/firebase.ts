import { initializeApp, getApps } from 'firebase/app'
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyB-bq7BAoZ-2IvDDI8V0MRFF-QlI0jUOzo",
  authDomain: "to7-media-otp.firebaseapp.com",
  projectId: "to7-media-otp",
  storageBucket: "to7-media-otp.firebasestorage.app",
  messagingSenderId: "352569613142",
  appId: "1:352569613142:web:04dea0c9434412a0dd14f7",
  measurementId: "G-LTLMB7LMWX"
}

// Initialize Firebase (prevent re-initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)

// Disable app verification for testing (remove in production)
// auth.settings.appVerificationDisabledForTesting = true

export { auth, RecaptchaVerifier, signInWithPhoneNumber }
export type { ConfirmationResult }
