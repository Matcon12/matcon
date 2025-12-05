import api from "../../api/api.jsx"

export async function generateInvoiceReport(startDate, endDate) {
  const response = await api.post("/invoiceReport", {
    startDate,
    endDate,
  })

  if (response.status === 200) {
    return response.data
  }

  throw new Error("Failed to generate invoice report")
}
