import axios from "axios";

export const api = axios.create({
  baseURL: "/api/backend",
  headers: {
    "Content-Type": "application/json",
  },
});
