require('dotenv').config()
const express = require('express')
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 4001

app.use(cors({
    origin: 'https://localhost:3000',
    credentials: true
}))

app.use(express.json())
// ============================

// ===== Start Route =====

// test route
app.get('/',(req,res) => {
    res.json({message:'Connect node success!'})
})

// 404 Check
app.use((req,res) => res.status(404).json({message: 'Invalid Route!'}))

// End , Listen Port;
app.listen(PORT , () => console.log(`Server Running On Port ${PORT}`))