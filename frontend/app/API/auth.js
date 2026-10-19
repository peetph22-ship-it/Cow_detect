import axios from 'axios'
import { getNodeApiBase, base } from './baseAPI'

export default {
  login: (data) => {
    const apiBase = getNodeApiBase() || base || 'http://localhost:4001/api'
    return axios.post(`${apiBase}/auth/login`, data)
  }
}