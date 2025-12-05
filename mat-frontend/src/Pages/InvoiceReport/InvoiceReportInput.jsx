import { useState } from "react"
import { DatePicker, Space } from "antd"
import dayjs from "dayjs"
import "./InvoiceReportInput.css"
import { generateInvoiceReport } from "./ReportServices"
import { downloadInvoiceReport } from "./ExcelUtils"

export default function InvoiceReportInput() {
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
  })

  const handleDateChange = (field) => (date, dateString) => {
    // Handle empty string or null values when user clears the date
    const value = dateString && dateString.trim() !== "" ? dateString : null

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate that both dates are provided
    if (!formData.startDate || !formData.endDate) {
      alert("Please select both start date and end date")
      return
    }

    try {
      const responseData = await generateInvoiceReport(
        formData.startDate,
        formData.endDate
      )
      if (responseData) {
        downloadInvoiceReport(responseData)
      }
    } catch (error) {
      console.error("Failed to generate invoice report:", error)
      alert(`Failed to generate invoice report: ${error.message}`)
    }
  }

  return (
    <div className="invoice-report-container">
      <div className="input-details-container">
        <h3>Invoice Report</h3>
        <form onSubmit={handleSubmit} className="input-details-form">
          <DateField
            label="Start Date"
            value={formData.startDate}
            onChange={handleDateChange("startDate")}
          />
          <DateField
            label="End Date"
            value={formData.endDate}
            onChange={handleDateChange("endDate")}
          />
          <button type="submit">Get Invoice Report</button>
        </form>
      </div>
    </div>
  )
}

// DateField component for date picker with label
function DateField({ label, value, onChange }) {
  return (
    <div className="datePickerContainers">
      <Space direction="vertical">
        <DatePicker
          onChange={onChange}
          value={value ? dayjs(value, "DD-MM-YYYY") : ""}
          format="DD-MM-YYYY"
          placeholder={label}
        />
        {value && <label className="poLabel">{label}:</label>}
      </Space>
    </div>
  )
}
