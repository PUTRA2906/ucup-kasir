// Skema SQLite dimuat sebagai raw string agar bisa dijalankan
// lewat Capacitor SQLite di platform native (bukan baca file).
// Vite `?raw` import mengembalikan isi file sebagai string.
import initSQLRaw from './init.sql?raw'

export const initStatements: string = initSQLRaw
