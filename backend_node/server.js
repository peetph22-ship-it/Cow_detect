require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 4001

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}))

app.use(express.json())
// ============================

// ===== Start Route =====

// test route
app.get('/',(req,res) => {
    res.json({message:'Connect node success!'})
})

// routerAPI ===================

// auth
const auth = require('./app/routes/authRouter')
app.use('/api/auth',auth)

// users
const users = require('./app/routes/Admin/users')
app.use('/api/Admin/users',users)

// sensors / IoT (Admin & Global)
const sensors = require('./app/routes/Admin/sensors')
app.use('/api/Admin/sensors', sensors)
app.use('/api/sensors', sensors)

// farms (Admin)
const farms = require('./app/routes/Admin/farms')
app.use('/api/Admin/farms', farms)


// =============================

// 404 Check
app.use((req,res) => res.status(404).json({message: 'Invalid Route!'}))

// Start Daily LSTM Scheduler (Runs daily at 20:00 Bangkok Time)
const { startDailyLstmCron } = require('./app/services/dailyLstmScheduler')

// End , Listen Port;
app.listen(PORT , () => {
    console.log(`Server Running On Port ${PORT}`)
    startDailyLstmCron()
})