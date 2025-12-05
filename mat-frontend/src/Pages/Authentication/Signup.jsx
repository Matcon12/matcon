import { useState } from "react"
import "./Signup.css"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext.jsx"

import { ToastContainer, toast } from "react-toastify"

export default function Signup() {
  const { signup } = useAuth()
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

    // Password validation
    if (!validatePassword(formData.password)) {
      setError(
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
      )
      return
    }

    try {
      await signup(formData)
      toast.success("New user has been added successfully!")
      setFormData({
        username: "",
        password: "",
      })
    } catch (err) {
      setError(
        "Signup error: " + (err.response?.data?.message || "Please try again.")
      )
    }
  }

  return (
    <div className="login-container">
      <form action="" onSubmit={handleSubmit} autoComplete="off">
        <div className="signup-container">
          {error && <p className="error-message">{error}</p>}
          <h1>Signup</h1>
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
          <button type="submit">Signup</button>
          {/* <div className="form-footer">
            <p>Already have an account?</p>
            <Link to="/login">Login</Link>
          </div> */}
        </div>
      </form>
      <div>
        <ToastContainer />
      </div>
    </div>
  )
}
