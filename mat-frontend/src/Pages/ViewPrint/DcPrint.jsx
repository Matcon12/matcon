import React, { useState, useRef } from "react"
import "./InvoicePrint.css"
import { useReactToPrint } from "react-to-print"
import DcPrint from "../../components/DC/Dc.jsx"
import api from "../../api/api"

export default function DcReport() {
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    year: "2024-25",
  })

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

  const DcReportComponent = React.forwardRef((props, ref) => (
    <div ref={ref} className="dc-container-container">
      <DcPrint formData={props.formData} />
    </div>
  ))

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
      })
  }

  return (
    <div className="dc-report-container">
      <div className="input-details-container">
        <h3>Delivery Challan:</h3>
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
          <button type="submit">Get DC</button>
        </form>

        {responseData && (
          <>
            <DcReportComponent formData={responseData} />
            <div>
              <button onClick={handlePrint}>Print this out!</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
