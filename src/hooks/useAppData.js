import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export function useAuth() {
  const [user,       setUser]       = useState(null)
  const [profile,    setProfile]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  async function loadProfile(authUser) {
    if (!authUser) { setProfile(null); setLoading(false); return }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      loadProfile(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function logout() {
    await supabase.auth.signOut()
    setUser(null); setProfile(null); setIsRecovery(false)
  }

  return { user, profile, loading, login, logout, isRecovery, setIsRecovery }
}

export function useSocietes() {
  const [societes, setSocietes] = useState([])

  async function load() {
    const { data } = await supabase.from('societes').select('*').order('nom')
    setSocietes(data || [])
  }

  useEffect(() => { load() }, [])

  async function create(nom) {
    await supabase.from('societes').insert({ nom })
    load()
  }

  async function update(id, nom) {
    await supabase.from('societes').update({ nom }).eq('id', id)
    load()
  }

  async function remove(id) {
    await supabase.from('societes').delete().eq('id', id)
    load()
  }

  return { societes, createSociete: create, updateSociete: update, deleteSociete: remove, reloadSocietes: load }
}

export function useSalaries() {
  const [salaries, setSalaries] = useState([])

  async function load() {
    const { data } = await supabase
      .from('salaries')
      .select('*, societes(nom)')
      .order('nom')
    setSalaries(data || [])
  }

  useEffect(() => { load() }, [])

  async function create({ nom, poste, email, societe_id }) {
    await supabase.from('salaries').insert({ nom, poste, email, societe_id })
    load()
  }

  async function update(id, fields) {
    await supabase.from('salaries').update(fields).eq('id', id)
    load()
  }

  async function remove(id) {
    await supabase.from('salaries').delete().eq('id', id)
    load()
  }

  return { salaries, createSalarie: create, updateSalarie: update, deleteSalarie: remove, reloadSalaries: load }
}

export function useConges() {
  const [conges,  setConges]  = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('conges')
      .select(`*, salaries (id, nom, poste, societe_id, societes (nom))`)
      .order('debut', { ascending: false })
    setConges(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function soumettre({ salarie_id, type, debut, fin, commentaire, statut='En attente' }) {
    const { error } = await supabase.from('conges').insert({
      salarie_id, type, debut, fin, commentaire, statut
    })
    if (error) throw error
    load()
  }

  async function changerStatut(id, statut) {
    const { error } = await supabase.from('conges').update({ statut }).eq('id', id)
    if (error) throw error
    load()
  }

  async function supprimer(id) {
    await supabase.from('conges').delete().eq('id', id)
    load()
  }

  useEffect(() => {
    const channel = supabase
      .channel('conges-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conges' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  return { conges, loading, soumettre, changerStatut, supprimer, reloadConges: load }
}