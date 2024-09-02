import "./Invoice.css"
import InvoiceDetails from "./InvoiceDetails/InvoiceDetails"
import TransportationMode from "./TransportationMode/TransportationMode"
import ReceiverDetails from "./ReceiverDetails/ReceiverDetails"
import ConsigneeDetails from "./ConsigneeDetails/ConsigneeDetails"
import POTable from "./POTable/POTable"
import InvoiceValue from "./InvoiceValue/InvoiceValue"
import Toc from "./Toc/Toc"
import { useState, useEffect } from "react"

export default function Invoice({ formData }) {
  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split("-")
    return `${day}-${month}-${year}`
  }

  const [poTableItems, setPoTableItems] = useState([])
  const [totalTaxableValue, setTotalTaxableValue] = useState(0)
  const [totalCgst, setTotalCgst] = useState(0)
  const [totalIgst, setTotalIgst] = useState(0)
  const [totalSgst, setTotalSgst] = useState(0)
  const [grandTotal, setGrandTotal] = useState(0)
  const [grandTotalwoKit, setGrandTotalwoKit] = useState(0)

  useEffect(() => {
    if (formData?.inv) {
      // console.log("formData: ", formData.inv)
      const newState = formData.inv.filter((prevData) => {
        return !prevData.po_sl_no.includes(".")
      })
      setPoTableItems(newState)

      let grandTotal = 0
      formData.inv.forEach((prevData, idx) => {
        if (!prevData.po_sl_no.includes(".")) {
          grandTotal +=
            prevData.cgst_price +
            prevData.sgst_price +
            prevData.igst_price +
            prevData.taxable_amt
        }
      })
      setGrandTotalwoKit(grandTotal)
      let taxableValueSum = 0
      let cgstSum = 0
      let sgstSum = 0
      let igstSum = 0
      // let totalSum = 0
      formData.inv.forEach((prevData, idx) => {
        if (prevData.po_sl_no.includes(".")) {
          taxableValueSum += prevData.taxable_amt
          cgstSum += prevData.cgst_price
          sgstSum += prevData.sgst_price
          igstSum += prevData.igst_price
        }
      })
      setTotalTaxableValue(taxableValueSum)
      setTotalCgst(cgstSum)
      setTotalIgst(igstSum)
      setTotalSgst(sgstSum)
      // setGrandTotal(totalTaxableValue + totalCgst + totalIgst + totalSgst)
    }
  }, [formData])

  const poTableKitChanges = {
    totalTaxableValue,
    totalCgst,
    totalIgst,
    totalSgst,
  }

  return (
    <>
      {formData ? (
        <>
          <div className="invoice-container">
            <p className="tax_invoice_heading">TAX INVOICE</p>
            <div className="column">
              <InvoiceDetails
                gcn_no={formData.odc1.gcn_no}
                gcn_date={formatDate(formData.odc1.gcn_date)}
                gst_no={formData.c.cust_gst_id}
              />
              <TransportationMode
                po_no={formData.odc1.po_no}
                po_date={formatDate(formData.odc1.po_date)}
                gcn_date={formatDate(formData.odc1.gcn_date)}
                city={formData.c.cust_city}
              />
            </div>
            <div className="column">
              <ReceiverDetails
                name={formData.r.cust_name}
                address={formData.r.cust_addr1}
                address2={formData.r.cust_addr2}
                state={formData.r.cust_st_name}
                city={formData.r.cust_city}
                code={formData.r.cust_st_code}
                pin={formData.r.cust_pin}
                gst_no={formData.r.cust_gst_id}
                gst_exception={formData.r.gst_exception}
              />
              <ConsigneeDetails
                name={formData.c.cust_name}
                address={formData.c.cust_addr1}
                address2={formData.c.cust_addr2}
                state={formData.c.cust_st_name}
                city={formData.c.cust_city}
                code={formData.c.cust_st_code}
                pin={formData.c.cust_pin}
                gst_no={formData.c.cust_gst_id}
              />
            </div>
            <POTable
              po_data={poTableItems}
              gr={formData.gr}
              total_qty={formData.total_qty}
              total_taxable_value={formData.total_taxable_value}
              total_cgst={formData.total_cgst}
              total_sgst={formData.total_sgst}
              total_igst={formData.total_igst}
              pack_size={formData.pack_size}
              poTableKitChanges={poTableKitChanges}
            />
            <div className="page-break">
              <InvoiceValue
                amount={formData.amount}
                gt={formData.gt}
                grandTotal={grandTotalwoKit}
              />
              <Toc />
              <div className="footer">
                <h5>MATCON/FORMS/021/00</h5>
              </div>
            </div>
          </div>
        </>
      ) : (
        <h1>Loading.......</h1>
      )}
    </>
  )
}
