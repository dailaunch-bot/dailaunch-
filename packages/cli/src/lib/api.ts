import axios from 'axios';

export const API_URL = process.env.DAILAUNCH_API_URL || 'https://api.dailaunch.online';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 120_000, // 2 menit — deploy bisa lama
});
