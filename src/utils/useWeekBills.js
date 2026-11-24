import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db, col } from '../firebase'

export function useWeekBills(week, year) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!week || !year) return
    setLoading(true)
    const q = query(collection(db, col('bills')), where('week', '==', week), where('year', '==', year))
    const unsub = onSnapshot(q, (snap) => {
      setBills(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [week, year])

  return { bills, loading }
}

export function useBonchonWeekBills(week, year) {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!week || !year) return
    setLoading(true)
    const q = query(collection(db, col('bonchon_bills')), where('week', '==', week), where('year', '==', year))
    const unsub = onSnapshot(q, (snap) => {
      setBills(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [week, year])

  return { bills, loading }
}

