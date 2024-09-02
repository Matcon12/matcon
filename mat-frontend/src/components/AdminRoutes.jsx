// components/AdminRoute.jsx
import React from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const AdminRoute = ({ element }) => {
  const { user } = useAuth()

  if (!user || !user.isAdmin) {
    // Redirect to home or another appropriate page if not admin
    return <Navigate to="/login" />
  }

  return element
}

export default AdminRoute
