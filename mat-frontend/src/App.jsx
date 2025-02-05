import Navbar from "./components/Navbar/Navbar.jsx"
import { Outlet, Routes, Route, useLocation } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext.jsx"

import Sidebar from "./components/Sidebar/Sidebar.jsx"

import CreatePO from "./Pages/Form/CreatePO/Customer.jsx"
import Invoice from "./Pages/Invoice/Invoice.jsx"
import PrintInvoice from "./Pages/Invoice/PrintInvoice.jsx"
import UpdatePO from "./Pages/Form/UpdatePO/UpdatePO.jsx"
import AddCustomerDetails from "./Pages/CustomerDetails/AddCustomerDetails.jsx"
import AddProductDetails from "./Pages/ProductDetails/AddProductDetails.jsx"
import EditCustomerDetails from "./Pages/CustomerDetails/EditCustomerDetails.jsx"
import EditProductDetails from "./Pages/ProductDetails/EditProductDetails.jsx"
import Report from "./Pages/ViewPrint/ViewPrint.jsx"
import Signup from "./Pages/Authentication/Signup.jsx"
import Login from "./Pages/Authentication/Login.jsx"
import ErrorPage from "./Pages/ErrorPage/error-page.jsx"

import "./App.css"
import CompletePage from "./Pages/HomePage/HomePage.jsx"

import ProtectedLayout from "./helper/ProtectedLayout.jsx"
import InvoiceReport from "./Pages/ViewPrint/InvoicePrint.jsx"
import DcReport from "./Pages/ViewPrint/DcPrint.jsx"

import InvoiceReportInput from "./Pages/InvoiceReport/InvoiceReportInput.jsx"

import { useAuth } from "./context/AuthContext.jsx"
import InvoicePrint from "./Pages/ViewPrint/InvoicePrint.jsx"

import PermissionRoute from "./Route/PermissionRoute.jsx"
import OutstandingPO from "./Pages/OutstandingPO/OutstandingPO.jsx"

export default function App() {
  const location = useLocation()
  const { hash, pathname, search } = location
  console.log(pathname)

  // const { user } = useAuth()

  // useEffect(() => {
  //   const handleBeforeUnload = () => {
  //     const url = "http://127.0.0.1:8000/purchase_order/update_user_status"
  //     if (user) {
  //       // Send a request to update user status to inactive
  //       navigator.sendBeacon(url, JSON.stringify({ is_active: 0 }))
  //     }
  //   }

  //   // Add the event listener
  //   window.addEventListener("beforeunload", handleBeforeUnload)

  //   // Cleanup the event listener on component unmount
  //   return () => {
  //     window.removeEventListener("beforeunload", handleBeforeUnload)
  //   }
  // }, [user])

  return (
    <div className="container">
      <AuthProvider>
        <Navbar />
        <div className="sidebar-and-content">
          {/* {pathname !== "/login" &&
            pathname !== "/Signup" &&
            pathname !== "/" && <Sidebar />} */}
          <Routes>
            <Route element={<ProtectedLayout />}>
              <Route path="/" element={<CompletePage />} />
              <Route path="purchase_order" element={<CreatePO />} />
              <Route path="edit_customerPurchaseOrder" element={<UpdatePO />} />
              <Route path="invoice_generation">
                <Route index element={<Invoice />} />
                <Route path="print_invoice" element={<PrintInvoice />} />
              </Route>
              <Route
                path="add_customer_details"
                element={<AddCustomerDetails />}
              />
              <Route
                path="add_product_details"
                element={<AddProductDetails />}
              />
              <Route
                path="edit_customer_details"
                element={<EditCustomerDetails />}
              />
              <Route
                path="edit_product_details"
                element={<EditProductDetails />}
              />
              <Route path="print">
                <Route index element={<InvoicePrint />} />
              </Route>
              <Route path="report">
                <Route index element={<InvoiceReportInput />} />
              </Route>
              <Route path="outstandingPO" element={<OutstandingPO />} />
            </Route>
            <Route
              path="signup"
              element={
                <PermissionRoute requiredRole="view_signup">
                  <Signup />
                </PermissionRoute>
              }
            />
            <Route path="login" element={<Login />} />
            <Route path="*" element={<ErrorPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </div>
  )
}
