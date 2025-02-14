import { Space, DatePicker } from "antd"
import dayjs from "dayjs"
import api from "../../api/api.jsx"
import { useState, useEffect } from "react"
import AutoCompleteComponent from "../../components/AutoComplete/AutoCompleteComponent.jsx"
import * as XLSX from "xlsx"
import { ToastContainer, toast } from "react-toastify"
import "./OutstandingPO.css"

export default function OutstandingPO() {
  const initialFormData = {
    from_date: "",
    to_date: "",
    cust_id: "",
  }

  const [formData, setFormData] = useState(initialFormData)
  const [customerData, setCustomerData] = useState()
  const [filteredCustomerData, setFilteredCustomerData] = useState()

  const numericFields = [
    "Unit Price",
    "Total Quantity",
    "Quantity Sent",
    "Realised Value",
    "Quantity Balance",
    "Outstanding Value",
  ]

  const onStartDateChange = (date, dateString) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      from_date: dateString,
    }))
  }

  const onEndDateChange = (date, dateString) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      to_date: dateString,
    }))
  }

  useEffect(() => {
    api.get("/getCustomerData").then((response) => {
      setCustomerData(response.data.customerData)
    })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()

    api
      .get("/outstandingPO", {
        params: {
          from_date: formData.from_date,
          to_date: formData.to_date,
          cust_id: formData.cust_id,
        },
      })
      .then((response) => {
        if (response.status === 200) {
          const responseData = response.data.purchase_order
          console.log(responseData)

          if (responseData.length != 0) {
            console.log("entered")
            const ws = XLSX.utils.json_to_sheet(responseData)

            // Convert numeric fields to numbers
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
                  }
                }
              }
            }

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
                  <h2>Purchase Order Report</h2>
                  <div class="table-responsive">
                    <table class="table table-bordered">
                      <thead>
                        <tr>
                          ${Object.keys(responseData[0])
                            .map((header) => `<th>${header}</th>`)
                            .join("")}
                        </tr>
                      </thead>
                      <tbody>
                        ${responseData
                          .map(
                            (row) =>
                              `<tr>${Object.values(row)
                                .map((value, index) => {
                                  const alignRight =
                                    index > 6
                                      ? 'style="text-align: right;"'
                                      : ""
                                  return `<td ${alignRight}>${value}</td>`
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
          } else {
            toast.info("There are no outstanding PO for the given data")
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

        // Set number format for numeric columns
        const range = XLSX.utils.decode_range(ws["!ref"])
        for (let C = range.s.c; C <= range.e.c; C++) {
          const header = XLSX.utils.encode_col(C) + "1"
          const headerValue = ws[header].v

          if (numericFields.includes(headerValue)) {
            for (let R = range.s.r + 1; R < range.e.r; R++) {
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
        <h3>Purchase Order Report</h3>
        <form onSubmit={handleSubmit} className="input-details-OPOform">
          <div className="OPOInputs">
            <div className="datesPicker">
              <div className="datePickerContainers">
                <Space direction="vertical">
                  <DatePicker
                    onChange={onStartDateChange}
                    name="from_date"
                    value={
                      formData.from_date
                        ? dayjs(formData.from_date, "DD-MM-YYYY")
                        : ""
                    }
                    format="DD-MM-YYYY"
                    placeholder={"Start Date"}
                  />
                  {formData.from_date && (
                    <label className="poLabel">Start Date:</label>
                  )}
                </Space>
              </div>
              <div className="datePickerContainers">
                <Space direction="vertical">
                  <DatePicker
                    onChange={onEndDateChange}
                    name="to_date"
                    value={
                      formData.to_date
                        ? dayjs(formData.to_date, "DD-MM-YYYY")
                        : ""
                    }
                    format="DD-MM-YYYY"
                    placeholder={"End Date"}
                  />
                  {formData.to_date && (
                    <label className="poLabel">End Date:</label>
                  )}
                </Space>
              </div>
            </div>
            <div className="autocomplete-wrapper">
              <AutoCompleteComponent
                data={customerData}
                mainData={formData}
                setData={setCustomerData}
                setMainData={setFormData}
                // handleChange={handleChange}
                filteredData={filteredCustomerData}
                setFilteredData={setFilteredCustomerData}
                name="cust_id"
                placeholder="Enter Customer ID (Optional)"
                search_value="cust_id"
              />
            </div>
          </div>
          <button type="submit">Get Report</button>
        </form>
      </div>

      <div>
        <ToastContainer />
      </div>
    </div>
  )
}
