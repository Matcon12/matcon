import React, { createContext, useState, useEffect, useContext } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import api from "../api/api.jsx"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem("jwt")
    if (token) {
      api
        .get("/test_token", {
          headers: { Authorization: `token ${token}` },
          params: { token, user },
        })
        .then((response) => {
          const data = response.data

          if (data.valid) {
            setUser({ token, ...data.user })
            localStorage.setItem("jwt", data.token)
          } else {
            localStorage.removeItem("jwt")
          }
        })
        .catch((error) => {
          console.error("Error verifying token:", error)
          localStorage.removeItem("jwt")
        })
    }
  }, [])

  const signup = async (credentials) => {
    try {
      const response = await api.post("/signup", credentials)
      if (response.statusText) {
        localStorage.setItem("jwt", response.data.token)
        setUser({ token: response.data.token, ...response.data.user })
        navigate("/", { replace: true })
      }
    } catch (error) {
      console.error("Signup error:", error)
      throw error // Rethrow the error so it can be caught in the component
    }
  }

  const login = async (credentials) => {
    try {
      const response = await api.post("/login", credentials)
      const data = response.data
      console.log("erorr data: ", data)
      if (data.token) {
        localStorage.setItem("jwt", data.token)
        setUser({ token: data.token, ...data.user })
        navigate("/", { replace: true })
      } else {
        console.error("Login error:", data.error)
        return data // Handle error messages from the backend (e.g., "User is already logged in")
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error // Rethrow the error so it can be caught in the component
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem("jwt")
      const response = await api.post(
        "/logout",
        {}, // Body is empty for logout
        {
          headers: {
            Authorization: `Token ${token}`, // Ensure 'Token' is the correct prefix
          },
        }
      )
      if (response.status === 200) {
        console.log(response.data)
        setUser(null)
        localStorage.removeItem("jwt")
        navigate("/login", { replace: true })
      }
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  const isAdmin = user && user.is_superuser

  return (
    <AuthContext.Provider value={{ user, login, logout, signup, isAdmin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
