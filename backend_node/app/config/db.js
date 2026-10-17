const { Pool } = require('pg')

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
})

// จับ error บน idle client เพื่อป้องกัน Node.js crash เมื่อ Supabase ปิด idle connection
pool.on('error', (err, client) => {
    console.warn('[PostgreSQL Pool Warning]: Idle client connection issue:', err.message)
})

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
}