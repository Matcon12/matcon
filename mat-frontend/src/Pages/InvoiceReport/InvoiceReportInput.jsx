import { DatePicker, Space } from "antd"
import { useState } from "react"
import dayjs from "dayjs"
import "./InvoiceReportInput.css"
import api from "../../api/api"
import * as XLSX from "xlsx"

export default function InvoiceReportInput() {
  const initialFormData = {
    startDate: "",
    endDate: "",
  }

  const [formData, setFormData] = useState(initialFormData)

  const onStartDateChange = (date, dateString) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      startDate: dateString,
    }))
  }

  const onEndDateChange = (date, dateString) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      endDate: dateString,
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    api
      .post("/invoiceReport", {
        startDate: formData.startDate,
        endDate: formData.endDate,
      })
      .then((response) => {
        if (response.status === 200) {
          const responseData = response.data

          if (responseData) {
            const ws = XLSX.utils.json_to_sheet(responseData.data)

            const htmlString = XLSX.write(
              { Sheets: { Sheet1: ws }, SheetNames: ["Sheet1"] },
              { bookType: "html", bookSST: true, type: "binary" }
            )

            const bootstrapLink =
              '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">'

            const htmlWithStyles = `
              <html>
                <head>
                  ${bootstrapLink}
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      background-color: #f4f4f4;
                      padding: 20px;
                    }
                    h2 {
                      color: #333;
                      border-bottom: 2px solid #ccc;
                      padding-bottom: 10px;
                      font-size: 1.5em;
                    }
                    table {
                      width: 100%;
                      border-collapse: collapse;
                      margin-bottom: 20px;
                    }
                    th, td {
                      border: 1px solid #ddd;
                      padding: 8px;
                      text-align: left;
                      font-size: 0.9em;
                      white-space: nowrap; 
                      overflow: hidden;
                      text-overflow: ellipsis;
                    }
                    th {
                      background-color: #f2f2f2;
                    }
                    button {
                      background-color: #4caf50;
                      color: white;
                      padding: 10px 15px;
                      margin: 10px;
                      cursor: pointer;
                      border: none;
                      border-radius: 5px;
                    }
                    button.close {
                      background-color: #d9534f;
                      margin-left: 10px;
                    }
                    button:hover {
                      background-color: #45a049;
                    }
                  </style>
                </head>
                <body>
                  <h2>Invoice Report</h2>
                  <div class="table-responsive">
                    <table class="table table-bordered">
                      <thead>
                        <tr>
                          ${Object.keys(responseData.data2[0])
                            .map((header) => `<th>${header}</th>`)
                            .join("")}
                        </tr>
                      </thead>
                      <tbody>
                        ${responseData.data2
                          .map(
                            (row) =>
                              `<tr>${Object.values(row)
                                .map((value, index) => {
                                  const alignRight =
                                    index >= 6
                                      ? 'style="text-align: right;"'
                                      : ""
                                  const formattedValue =
                                    typeof value === "number"
                                      ? value.toFixed(2)
                                      : value
                                  return `<td ${alignRight}>${formattedValue}</td>`
                                })
                                .join("")}</tr>`
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                  <button onclick="closeWindow()">Close</button>
                  <button onclick="downloadExcel()">Download Excel</button>

                  <h2>Invoice Report (HSN/SAC)</h2>
                  <div class="table-responsive">
                    <table class="table table-bordered">
                      <thead>
                        <tr>
                          ${Object.keys(responseData.data[0])
                            .map((header) => `<th>${header}</th>`)
                            .join("")}
                        </tr>
                      </thead>
                      <tbody>
                        ${responseData.data
                          .map(
                            (row) =>
                              `<tr>${Object.values(row)
                                .map((value, index) => {
                                  const alignRight =
                                    index >= 6
                                      ? 'style="text-align: right;"'
                                      : ""
                                  const formattedValue =
                                    typeof value === "number"
                                      ? value.toFixed(2)
                                      : value
                                  return `<td ${alignRight}>${formattedValue}</td>`
                                })
                                .join("")}</tr>`
                          )
                          .join("")}
                      </tbody>
                    </table>
                  </div>
                  <button onclick="closeWindow()">Close</button>
                  <button onclick="downloadExcel()">Download Excel</button>
                </body>
              </html>
            `

            downloadInvoiceReport(htmlString, htmlWithStyles)
          }
        }
      })
      .catch((e) => {
        console.error(e)
      })
  }

  const downloadInvoiceReport = (htmlString, htmlWithStyles) => {
    const blob = new Blob([htmlWithStyles], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const newWindow = window.open(url, "_blank")

    newWindow.closeWindow = function () {
      newWindow.close()
    }

    newWindow.downloadExcel = function () {
      try {
        const wb = XLSX.read(htmlString, { type: "binary" })
        const ws = wb.Sheets["Sheet1"]

        // Define numeric fields
        const numericFields = [
          "Quantity",
          "Ass.Value",
          "IGST Price (18%)",
          "CGST Price (9%)",
          "SGST Price (9%)",
          "Round Off",
          "Invoice Value",
        ] // Adjust this array based on your data

        // Set number format for numeric columns
        const range = XLSX.utils.decode_range(ws["!ref"])
        for (let C = range.s.c; C <= range.e.c; C++) {
          const header = XLSX.utils.encode_col(C) + "1"
          const headerValue = ws[header].v

          if (numericFields.includes(headerValue)) {
            for (let R = range.s.r + 1; R <= range.e.r; R++) {
              const cell = XLSX.utils.encode_cell({ r: R, c: C })
              if (ws[cell]) {
                ws[cell].v = parseFloat(ws[cell].v) // Convert to number
                ws[cell].t = "n" // Set cell type to number
                ws[cell].z = "#,##0.00" // Set number format with 2 decimal places
              }
            }
          }
        }

        XLSX.writeFile(wb, "Outstanding_PO.xlsx")
      } catch (error) {
        console.error("Error downloading Excel file", error)
      }
    }
  }

  return (
    <div className="invoice-report-container">
      <div className="input-details-container">
        <h3>Invoice Report</h3>
        <form onSubmit={handleSubmit} className="input-details-form">
          <div className="datePickerContainers">
            <Space direction="vertical">
              <DatePicker
                onChange={onStartDateChange}
                name="startDate"
                value={
                  formData.startDate
                    ? dayjs(formData.startDate, "DD-MM-YYYY")
                    : ""
                }
                format="DD-MM-YYYY"
                placeholder={"Start Date"}
              />
              {formData.startDate && (
                <label className="poLabel">Start Date:</label>
              )}
            </Space>
          </div>
          <div className="datePickerContainers">
            <Space direction="vertical">
              <DatePicker
                onChange={onEndDateChange}
                name="endDate"
                value={
                  formData.endDate ? dayjs(formData.endDate, "DD-MM-YYYY") : ""
                }
                format="DD-MM-YYYY"
                placeholder={"End Date"}
              />
              {formData.endDate && <label className="poLabel">End Date:</label>}
            </Space>
          </div>
          <button type="submit">Get Invoice Report</button>
        </form>
      </div>
    </div>
  )
}
