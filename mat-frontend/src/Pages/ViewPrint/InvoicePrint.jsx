import React, { useState, useEffect, useRef } from "react"
import "./InvoicePrint.css"
import { useReactToPrint } from "react-to-print"
import Invoice from "../../components/Invoice/Invoice"
import api from "../../api/api"
import DcPrint from "../../components/DC/Dc"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function InvoicePrint() {
  const [rates, setRates] = useState(null)
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    year: "",
  })
  const [responseData, setResponseData] = useState()
  const [totalPages, setTotalPages] = useState(0) // Using state to trigger a re-render

  const componentRef = useRef()

  useEffect(() => {
    api.get("/printInvoicePageData").then((response) => {
      setRates(response.data.gst_rates)
      console.log("gst_rates", response.data.gst_rates)
    })
  }, [])

  useEffect(() => {
    if (rates && rates.fin_year) {
      setFormData((prevData) => ({
        ...prevData,
        year: getAcademicYear(rates.fin_year),
      }))
    }
  }, [rates])

  function getAcademicYear(year) {
    const nextYear = year + 1
    return `${year}-${nextYear.toString().slice(-2)}`
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }))
  }

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
      console.log("Print finished")
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
        <Invoice formData={responseData} rates={rates} />
        <div className="print-footer">
          {/*Page{" "} */}
          <span
            className="pageNumber"
            ref={(el) => {
              if (el) pageRefs.current.push(el) // Add new refs dynamically
            }}
          ></span>{" "}
          {/*of <span className="totalPages">{totalPages}</span> */}
        </div>
      </div>
    )
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    api
      .get("/invoiceGeneration", {
        params: {
          gcn_no: formData.invoiceNumber,
          year: formData.year,
        },
      })
      .then((response) => {
        setResponseData(response.data.context)
        console.log(response.data.context)
      })
      .catch((error) => {
        console.log(error.response.data.error)
        toast.error(error.response.data.error)
        setResponseData()
      })
  }

  return (
    <div className="invoice-report-container">
      <div className="input-details-container">
        <h3>Invoice No.</h3>
        <form onSubmit={handleSubmit} className="input-details-form">
          <div>
            <input
              type="text"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleChange}
              placeholder=" "
            />
            <label
              alt="Enter the Invoice Number"
              placeholder="Invoice Number"
            ></label>
          </div>
          <div>
            <input
              type="text"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder=" "
            />
            <label alt="Enter the year" placeholder="Year"></label>
          </div>
          <button type="submit">Get Invoice</button>
        </form>

        {responseData && (
          <>
            <div>
              <button onClick={handlePrint}>Print this out!</button>
            </div>
            <InvoiceC ref={componentRef} />
            <DcPrint formData={responseData} />
          </>
        )}
      </div>
      <ToastContainer />
    </div>
  )
}
