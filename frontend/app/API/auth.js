import axios from 'axios'
import { getNodeApiBase } from './baseAPI'

export default {
  login: (data) => {
    const apiBase = getNodeApiBase() || 'http://localhost:4001/api'
    return axios.post(`${apiBase}/auth/login`, data)
  }
}