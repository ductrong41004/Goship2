import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as fbSignOut, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = loading
  const [profile, setProfile] = useState(null) // { name, role, active }
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u)
      if (!u) {
        setProfile(null)
        setProfileLoading(false)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    setProfileLoading(true)
    const ref = doc(db, 'users', firebaseUser.uid)
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(snap.exists() ? snap.data() : null)
      setProfileLoading(false)
    }, () => setProfileLoading(false))
    return unsub
  }, [firebaseUser])

  const login = (email, password) => signInWithEmailAndPassword(auth, email, password)
  const logout = () => fbSignOut(auth)

  const loading = firebaseUser === undefined || (firebaseUser && profileLoading)

  const value = {
    user: firebaseUser || null,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
