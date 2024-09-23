import React, { useState, useEffect, useRef } from "react"
import "./InvoicePrint.css"
import { useReactToPrint } from "react-to-print"
import Invoice from "../../components/Invoice/Invoice"
import api from "../../api/api"
import DcPrint from "../../components/DC/Dc"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

export default function InvoicePrint() {
  const [rates, setRates] = useState(null) // Initialize as null or empty
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    year: "", // Initially, keep it empty
  })

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
        year: getAcademicYear(rates.fin_year), // Update the formData when rates are available
      }))
    }
  }, [rates]) // This will run when `rates` is updated

  function getAcademicYear(year) {
    const nextYear = year + 1
    return `${year}-${nextYear.toString().slice(-2)}` // Return the year in '2024-25' format
  }

  const [responseData, setResponseData] = useState()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }))
  }

  const componentRef = useRef()
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  })

  console.log("formdata: ", formData)

  const InvoiceC = React.forwardRef((props, ref) => {
    const totalPages = useRef(0)

    useEffect(() => {
      if (componentRef.current) {
        totalPages.current = Math.ceil(
          componentRef.current.offsetHeight / window.innerHeight
        ) // Calculate total pages based on the height
      }
    }, [responseData]) // Recalculate when responseData changes

    return (
      <div ref={ref} className="invoice-container-container">
        <Invoice ref={ref} formData={responseData} rates={rates} />
        <div className="print-footer">
          Page <span className="pageNumber"></span> of{" "}
          <span className="totalPages">{totalPages.current}</span>
        </div>
      </div>
    )
  })

  // const InvoiceC = React.forwardRef((props, ref) => (
  //   <div ref={ref} className="invoice-container-container">
  //     <Invoice ref={ref} formData={responseData} rates={rates} />
  //     <div className="print-footer">
  //       Page <span className="pageNumber"></span> of{" "}
  //       <span className="totalPages"></span>
  //     </div>
  //   </div>
  // ))

  const handleSubmit = (e) => {
    e.preventDefault()
    api
      .get("/invoiceGeneration", {
        params: {
          gcn_no: formData.invoiceNumber,
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
              /*required={true}*/
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
              /*required={true}*/
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
