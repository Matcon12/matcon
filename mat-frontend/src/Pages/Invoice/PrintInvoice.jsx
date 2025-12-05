import Invoice from "../../components/Invoice/Invoice"
import { useLocation } from "react-router-dom"
import React, { useEffect, useState, useRef } from "react"
import { useReactToPrint } from "react-to-print"
import api from "../../api/api.jsx"
import "./Invoice.css"
import DcPrint from "../../components/DC/Dc.jsx"
import { ToastContainer, toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faSpinner } from "@fortawesome/free-solid-svg-icons"
import "react-toastify/dist/ReactToastify.css"

export default function PrintInvoice() {
  const [formData, setFormData] = useState()
  const [rates, setRates] = useState(null)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const location = useLocation()
  const { gcn_no } = location.state

  const componentRef = useRef()
  const dcComponentRef = useRef()

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Load rates first
        const ratesResponse = await api.get("/printInvoicePageData")
        setRates(ratesResponse.data.gst_rates)

        // Get current year in YYYY-YY format (e.g., 2024-25)
        const currentYear = new Date().getFullYear()
        const nextYear = currentYear + 1
        const year = `${currentYear}-${nextYear.toString().slice(-2)}`

        // Load invoice data
        const invoiceResponse = await api.get("/invoiceGeneration", {
          params: {
            gcn_no: gcn_no,
            year: year,
          },
        })

        setFormData(invoiceResponse.data.context)
        console.log(invoiceResponse.data.context)
      } catch (error) {
        console.log(error.response?.data?.error || error.message)
        toast.error(
          error.response?.data?.error || "Failed to load invoice data"
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (gcn_no) {
      loadData()
    }
  }, [gcn_no])

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    onBeforeGetContent: () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          if (componentRef.current) {
            // Calculate total pages based on the scroll height and window height
            const contentHeight = componentRef.current.scrollHeight
            const pageHeight = window.innerHeight // Approximate page height
            const pages = Math.floor(contentHeight / pageHeight)

            setTotalPages(pages) // Set total pages in state to trigger a re-render
          }
          resolve()
        }, 500) // Timeout to allow calculation (to ensure proper rendering)
      })
    },
    onAfterPrint: () => {
      console.log("Invoice print finished")
    },
  })

  const handleDcPrint = useReactToPrint({
    content: () => dcComponentRef.current,
    onAfterPrint: () => {
      console.log("DC print finished")
    },
  })

  const InvoiceC = React.forwardRef((props, ref) => {
    const pageRefs = useRef([])

    useEffect(() => {
      // Clear the refs array before adding new refs
      pageRefs.current = []

      // Ensure page numbers are assigned correctly
      setTimeout(() => {
        if (pageRefs.current.length > 0) {
          pageRefs.current.forEach((el, index) => {
            if (el) {
              el.innerText = index + 1 // Dynamically set the correct page number
            }
          })
        }
      }, 0) // Allow time for DOM updates
    }, [totalPages])

    return (
      <div ref={ref} className="invoice-container-container">
        <Invoice formData={formData} rates={rates} />
        <div className="print-footer">
          <span
            className="pageNumber"
            ref={(el) => {
              if (el) pageRefs.current.push(el) // Add new refs dynamically
            }}
          ></span>
        </div>
      </div>
    )
  })

  const DcComponent = React.forwardRef((props, ref) => {
    return (
      <div ref={ref} className="dc-container-container">
        <DcPrint formData={formData} />
      </div>
    )
  })

  return (
    <div className="invoice-report-container">
      <div className="reports-header">
        <h2>📋 Print Invoice: {gcn_no}</h2>
      </div>

      {/* Show skeleton cards while loading */}
      {isLoading && (
        <div className="preview-section">
          <div className="document-card skeleton-card">
            <div className="document-header">
              <h3>📄 Invoice</h3>
              <div className="skeleton-button"></div>
            </div>
            <div className="document-preview skeleton-preview">
              <div className="skeleton-content"></div>
            </div>
          </div>

          <div className="document-card skeleton-card">
            <div className="document-header">
              <h3>📦 Delivery Challan</h3>
              <div className="skeleton-button"></div>
            </div>
            <div className="document-preview skeleton-preview">
              <div className="skeleton-content"></div>
            </div>
          </div>
        </div>
      )}

      {/* Show actual documents when data is loaded */}
      {formData && !isLoading && (
        <div className="preview-section">
          <div className="document-card">
            <div className="document-header">
              <h3>📄 Invoice</h3>
              <button onClick={handlePrint} className="print-button">
                🖨️ Print Invoice
              </button>
            </div>
            <div className="document-preview">
              <div className="scaled-document">
                <InvoiceC ref={componentRef} />
              </div>
            </div>
          </div>

          <div className="document-card">
            <div className="document-header">
              <h3>📦 Delivery Challan</h3>
              <button onClick={handleDcPrint} className="print-button">
                🖨️ Print DC
              </button>
            </div>
            <div className="document-preview">
              <div className="scaled-document">
                <DcComponent ref={dcComponentRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show error message if no data and not loading */}
      {!formData && !isLoading && (
        <div className="preview-section">
          <div className="document-card">
            <div className="document-header">
              <h3>⚠️ No Data Available</h3>
            </div>
            <div className="document-preview">
              <div
                style={{ padding: "40px", textAlign: "center", color: "#666" }}
              >
                <p>Unable to load invoice data for GCN: {gcn_no}</p>
                <p>Please check if the invoice number exists and try again.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
