// src/utils/excelUtils.js
import * as XLSX from "xlsx"

export function downloadInvoiceReport(responseData) {
  // Generate the styled HTML for display
  const htmlWithStyles = generateStyledHtml(responseData)

  // Create blob and open window
  const blob = new Blob([htmlWithStyles], { type: "text/html" })
  const url = URL.createObjectURL(blob)

  // Store reference to the window
  const newWindow = window.open(url, "_blank")

  if (!newWindow) {
    alert("Please allow pop-ups for this site to view the report")
    return
  }

  // Store the response data in a global variable to access it later
  window.reportData = responseData

  // Wait for window to load before attaching functions
  newWindow.addEventListener("load", function () {
    // Add script to HTML document for these functions to be accessible
    const script = newWindow.document.createElement("script")
    script.textContent = `
      function closeWindow() {
        window.close();
      }
      
      function downloadMainExcel() {
        window.opener.downloadMainExcelReport();
      }
      
      function downloadHsnExcel() {
        window.opener.downloadHsnExcelReport();
      }
    `
    newWindow.document.body.appendChild(script)
  })

  // Function to download the main invoice report
  window.downloadMainExcelReport = function () {
    try {
      const data = window.reportData.data2
      if (!data || data.length === 0) {
        alert("No data available for download")
        return
      }

      // Create a new workbook with single sheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(data)

      // Apply number formatting
      applyNumberFormatting(ws)

      // Add the worksheet to the workbook - using a valid sheet name
      XLSX.utils.book_append_sheet(wb, ws, "Invoice Report")

      // Write the workbook to a file
      XLSX.writeFile(wb, "Invoice_Report_Main.xlsx")
    } catch (error) {
      console.error("Error downloading Excel file", error)
      alert("Error generating Excel file: " + error.message)
    }
  }

  // Function to download the HSN/SAC report
  window.downloadHsnExcelReport = function () {
    try {
      const data = window.reportData.data
      if (!data || data.length === 0) {
        alert("No data available for download")
        return
      }

      // Create a new workbook with single sheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(data)

      // Apply number formatting
      applyNumberFormatting(ws)

      // Add the worksheet to the workbook - using a valid sheet name without special characters
      XLSX.utils.book_append_sheet(wb, ws, "HSN SAC Report")

      // Write the workbook to a file
      XLSX.writeFile(wb, "Invoice_Report_HSN_SAC.xlsx")
    } catch (error) {
      console.error("Error downloading Excel file", error)
      alert("Error generating Excel file: " + error.message)
    }
  }
}

function generateStyledHtml(responseData) {
  const bootstrapLink =
    '<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous">'

  // Create the HTML string with proper script functions
  return `
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
          .button-group {
            margin: 10px 0 20px 0;
          }
        </style>
      </head>
      <body>
        ${generateReportSection("Invoice Report", responseData.data2)}
        <div class="button-group">
          <button onclick="closeWindow()">Close</button>
          <button onclick="downloadMainExcel()">Download Main Report Excel</button>
        </div>
        
        ${generateReportSection("Invoice Report (HSN/SAC)", responseData.data)}
        <div class="button-group">
          <button onclick="closeWindow()">Close</button>
          <button onclick="downloadHsnExcel()">Download HSN/SAC Report Excel</button>
        </div>
      </body>
    </html>
  `
}

function generateReportSection(title, data) {
  if (!data || !data.length) return ""

  return `
    <h2>${title}</h2>
    <div class="table-responsive">
      <table class="table table-bordered">
        <thead>
          <tr>
            ${Object.keys(data[0])
              .map((header) => `<th>${header}</th>`)
              .join("")}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) =>
                `<tr>${Object.values(row)
                  .map((value, index) => {
                    const alignRight =
                      index >= 6 ? 'style="text-align: right;"' : ""

                    // Special handling for Sl No column (first column) - display as integer
                    let formattedValue
                    if (index === 0 && typeof value === "number") {
                      formattedValue = Math.floor(value).toString()
                    } else if (typeof value === "number") {
                      formattedValue = value.toFixed(2)
                    } else {
                      formattedValue = value
                    }

                    return `<td ${alignRight}>${formattedValue}</td>`
                  })
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `
}

function applyNumberFormatting(ws) {
  const numericFields = [
    "Quantity",
    "Ass.Value",
    "IGST Price (18%)",
    "CGST Price (9%)",
    "SGST Price (9%)",
    "Round Off",
    "Invoice Value",
  ]

  const range = XLSX.utils.decode_range(ws["!ref"])
  for (let C = range.s.c; C <= range.e.c; C++) {
    const header = XLSX.utils.encode_col(C) + "1"
    const headerValue = ws[header]?.v

    if (headerValue === "Sl No") {
      // Format Sl No column as integers
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C })
        if (ws[cell] && typeof ws[cell].v === "number") {
          ws[cell].t = "n" // Set cell type to number
          ws[cell].z = "0" // Set number format as integer
        }
      }
    } else if (headerValue && numericFields.includes(headerValue)) {
      // Format other numeric fields with 2 decimal places
      for (let R = range.s.r + 1; R <= range.e.r; R++) {
        const cell = XLSX.utils.encode_cell({ r: R, c: C })
        if (ws[cell] && typeof ws[cell].v === "number") {
          ws[cell].t = "n" // Set cell type to number
          ws[cell].z = "#,##0.00" // Set number format with 2 decimal places
        }
      }
    }
  }
}
