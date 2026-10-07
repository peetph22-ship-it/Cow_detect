import axios from 'axios'
const api = 'http://localhost:4001/api/auth/login'
export default {login : (data) => axios.post(`${api}`,data)}