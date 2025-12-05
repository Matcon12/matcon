import { Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const PermissionRoute = ({ children, requiredRole }) => {
  const { user } = useAuth()

  if (!user || !user.permissions.includes(requiredRole)) {
    return <Navigate to="/" />
  }

  return children
}

export default PermissionRoute
