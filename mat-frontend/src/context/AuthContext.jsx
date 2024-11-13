import React, { createContext, useState, useEffect, useContext } from "react"
import { useNavigate } from "react-router-dom"
import api from "../api/api.jsx"

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Load initial user state from localStorage if available
    const storedUser = localStorage.getItem("user")
    return storedUser ? JSON.parse(storedUser) : null
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  console.log("auth context(user): ", user)

  useEffect(() => {
    const token = localStorage.getItem("jwt")
    if (token && !user) {
      // If token exists but no user is set, verify the token
      api
        .get("/test_token", {
          headers: { Authorization: `Token ${token}` },
        })
        .then((response) => {
          const data = response.data
          if (data.valid) {
            const userData = { token, ...data.user }
            setUser(userData)
            localStorage.setItem("user", JSON.stringify(userData)) // Persist user data
          } else {
            localStorage.removeItem("jwt")
            localStorage.removeItem("user")
          }
        })
        .catch((error) => {
          console.error("Error verifying token:", error)
          localStorage.removeItem("jwt")
          localStorage.removeItem("user")
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [user])

  if (loading) {
    return <div>Loading...</div>
  }

  const signup = async (credentials) => {
    try {
      const response = await api.post("/signup", credentials)
      if (response.statusText) {
        const userData = { token: response.data.token, ...response.data.user }
        localStorage.setItem("jwt", response.data.token)
        localStorage.setItem("user", JSON.stringify(userData))
        setUser(userData)
        navigate("/", { replace: true })
      }
    } catch (error) {
      console.error("Signup error:", error)
      throw error
    }
  }

  const login = async (credentials) => {
    try {
      const response = await api.post("/login", credentials)
      const data = response.data
      console.log("error data: ", data)
      if (data.token) {
        const userData = { token: data.token, ...data.user }
        localStorage.setItem("jwt", data.token)
        localStorage.setItem("user", JSON.stringify(userData))
        setUser(userData)
        navigate("/", { replace: true })
      } else {
        console.error("Login error:", data.error)
        return data
      }
    } catch (error) {
      console.error("Login error:", error)
      throw error
    }
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem("jwt")
      const response = await api.post(
        "/logout",
        {},
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      )
      if (response.status === 200) {
        setUser(null)
        localStorage.removeItem("jwt")
        localStorage.removeItem("user")
        console.log("JWT and user removed from localStorage") // Verify deletion
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
