import "./Navbar.css"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext.jsx"
import { useNavigate, useLocation } from "react-router-dom"

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { hash, pathname, search } = location

  const handleGoBack = () => {
    navigate(-1)
  }

  return (
    <>
      <div className="navbar">
        <img src="/image001.jpg" alt="" onClick={() => navigate("/")} />
        {pathname !== "/login" ? (
          <ul>
            <li>
              <Link onClick={handleGoBack}>Back</Link>
            </li>
            <li>
              {user ? (
                <Link to="/login" onClick={logout}>
                  Logout
                </Link>
              ) : (
                <Link to="/login">Login</Link>
              )}
            </li>
            {user?.permissions?.includes("view_signup") ? (
              <li>
                <Link to="/signup">Add New User</Link>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </>
  )
}
