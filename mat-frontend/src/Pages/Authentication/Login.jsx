import { useState } from "react"
import "./Signup.css"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext.jsx"

export default function Login() {
  const { login } = useAuth()
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError("")
  }

  const validatePassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    return regex.test(password)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    // Basic validation checks
    if (!formData.username) {
      setError("Username is required.")
      return
    }

    if (!formData.password) {
      setError("Password is required.")
      return
    }

    // Optional: Password strength validation (useful if your login policy requires it)
    if (!validatePassword(formData.password)) {
      setError(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
      )
      return
    }

    try {
      const message = await login(formData)
      if (message.status === 400) {
        setError(message.error) // Display the error message returned by the backend
      }
    } catch (err) {
      setError("Please check Username and Password.")
    }
  }

  return (
    <div className="login-container">
      <form action="" onSubmit={handleSubmit} autoComplete="off">
        <div className="signup-container">
          {error && <p className="error-message">{error}</p>}
          <h1>Login</h1>
          <div>
            <input
              type="text"
              required={true}
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder=" "
            />
            <label alt="Enter the Username" placeholder="Username"></label>
          </div>
          <div>
            <input
              type="password"
              required={true}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder=" "
            />
            <label alt="Enter the Password" placeholder="Password"></label>
          </div>
          <button type="submit">Login</button>
          {/* <div className="form-footer">
            <p>New User?</p>
            <Link to="/Signup">Signup</Link>
          </div> */}
        </div>
      </form>
    </div>
  )
}
