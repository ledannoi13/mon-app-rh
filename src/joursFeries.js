/* ─────────────────────────────────────────────────────
   JOURS FÉRIÉS FRANÇAIS + CALCUL JOURS OUVRABLES
   ───────────────────────────────────────────────────── */

// Calcule la date de Pâques (algorithme Meeus/Jones/Butcher)
function paques(annee) {
  const a = annee % 19
  const b = Math.floor(annee / 100)
  const c = annee % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31)
  const jour = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(annee, mois - 1, jour)
}

// Retourne tous les jours fériés français pour une année donnée
export function joursFeries(annee) {
  const p = paques(annee)
  const addDays = (date, n) => {
    const d = new Date(date)
    d.setDate(d.getDate() + n)
    return d
  }
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

  return new Set([
    `${annee}-01-01`,                    // Jour de l'An
    fmt(addDays(p, 1)),                  // Lundi de Pâques
    `${annee}-05-01`,                    // Fête du Travail
    `${annee}-05-08`,                    // Victoire 1945
    fmt(addDays(p, 39)),                 // Ascension
    fmt(addDays(p, 50)),                 // Lundi de Pentecôte
    `${annee}-07-14`,                    // Fête Nationale
    `${annee}-08-15`,                    // Assomption
    `${annee}-11-01`,                    // Toussaint
    `${annee}-11-11`,                    // Armistice
    `${annee}-12-25`,                    // Noël
  ])
}

// Formate une date en YYYY-MM-DD
function toStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// Vérifie si une date est un jour ouvrable
export function estOuvrable(date) {
  const d = new Date(date)
  const jour = d.getDay()
  if (jour === 0 || jour === 6) return false   // Weekend
  const annee = d.getFullYear()
  const feries = joursFeries(annee)
  return !feries.has(toStr(d))
}

// Calcule le nombre de jours ouvrables entre deux dates (inclus)
export function joursOuvrables(debut, fin) {
  const d = new Date(debut)
  const f = new Date(fin)
  if (d > f) return 0

  // Précalcule les fériés pour toutes les années concernées
  const feriesCache = {}
  for (let y = d.getFullYear(); y <= f.getFullYear(); y++) {
    feriesCache[y] = joursFeries(y)
  }

  let count = 0
  const cur = new Date(d)
  while (cur <= f) {
    const jour = cur.getDay()
    const str  = toStr(cur)
    const y    = cur.getFullYear()
    if (jour !== 0 && jour !== 6 && !feriesCache[y].has(str)) {
      count++
    }
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Retourne la liste des jours fériés dans une période
export function feriesDansPeriode(debut, fin) {
  const d = new Date(debut)
  const f = new Date(fin)
  const result = []

  const NOMS = {
    '01-01': 'Jour de l\'An',
    '05-01': 'Fête du Travail',
    '05-08': 'Victoire 1945',
    '07-14': 'Fête Nationale',
    '08-15': 'Assomption',
    '11-01': 'Toussaint',
    '11-11': 'Armistice',
    '12-25': 'Noël',
  }

  const feriesCache = {}
  for (let y = d.getFullYear(); y <= f.getFullYear(); y++) {
    feriesCache[y] = joursFeries(y)
  }

  const cur = new Date(d)
  while (cur <= f) {
    const str = toStr(cur)
    const y   = cur.getFullYear()
    const mmdd = str.slice(5)
    if (feriesCache[y].has(str)) {
      result.push({
        date: str,
        nom: NOMS[mmdd] || 'Jour férié',
      })
    }
    cur.setDate(cur.getDate() + 1)
  }
  return result
}