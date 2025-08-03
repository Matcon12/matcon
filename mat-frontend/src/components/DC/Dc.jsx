import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import { useReactToPrint } from "react-to-print"
import React, { useRef } from "react"
import "./Dc.css"
import { defaultBaseSortFn } from "match-sorter"

function groupDataByDescription(data) {
  console.log("entered groupdataby description")
  const groupedData = []
  data.forEach((item, index) => {
    const existingGroup = groupedData.find(
      (group) => group.prod_desc === item.prod_desc
    )
    console.log("outside existing group: ", existingGroup)
    if (existingGroup) {
      console.log("existing group: ", existingGroup)
      existingGroup.items.push(item)
    } else {
      groupedData.push({
        sl_no: groupedData.length + 1,
        prod_desc: item.prod_desc,
        items: [item],
      })
    }
  })
  return groupedData
}

function nonGroupData(data) {
  const groupedData = []
  data.forEach((item, index) => {
    groupedData.push({
      sl_no: groupedData.length + 1,
      prod_desc: item.prod_desc,
      items: [item],
    })
  })
  return groupedData
}

function stripUnits(value) {
  const numericValue = parseFloat(value.replace(/[^\d.-]/g, ""))
  const unit = value.replace(/[\d\s.-]/g, "")
  return { numericValue, unit }
}

function DcReportC({ formData }) {
  const [dcTable, setDcTable] = useState([])

  useEffect(() => {
    const newState = formData.odc.filter((items) => {
      return !items.prod_id.startsWith("KIT")
    })
    setDcTable(newState)
  }, [formData])

  // const groupedData = groupDataByDescription(dcTable)
  console.log("dcTable: ", dcTable)
  console.log("formData: ", formData)
  console.log(formData.odc.length != dcTable.length)
  const groupedData = groupDataByDescription(dcTable)
  // formData.odc.length != dcTable.length
  //   ? nonGroupData(dcTable)
  //   : groupDataByDescription(dcTable)

  function formatDate(dateStr) {
    const [year, month, day] = dateStr.split("-")
    return `${day}-${month}-${year}`
  }

  return (
    <div className="dc-container">
      <h2>DELIVERY CHALLAN</h2>
      <br />
      <br />
      <br />
      <br />
      <div className="dc-header">
        <div className="to-address">
          <p>
            To,
            <br />
            {formData.c.cust_name}
            <br />
            {formData.c.cust_addr1}
            <br />
            {formData.c.cust_addr2}
            <br />
            {formData.c.cust_city}-{formData.c.cust_pin}
            <br />
            <p>GST No.: {formData.c.cust_gst_id}</p>
          </p>
        </div>
        <div className="dc-details">
          <table>
            <tbody>
              <tr>
                <td>
                  <strong>DC No.</strong>
                </td>
                <td>&nbsp;:&nbsp;</td>
                <td>{formData.odc[0].gcn_no}</td>
              </tr>
              <tr>
                <td>
                  <strong>Date</strong>
                </td>
                <td>&nbsp;:&nbsp;</td>
                <td>{formatDate(formData.odc[0].gcn_date)}</td>
              </tr>
              <tr>
                <td>
                  <strong>P.O. No.</strong>
                </td>
                <td>&nbsp;:&nbsp;</td>
                <td>{formData.odc[0].po_no}</td>
              </tr>
              <tr>
                <td>
                  <strong>Date</strong>
                </td>
                <td>&nbsp;:&nbsp;</td>
                <td>{formatDate(formData.odc[0].po_date)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="message">
        <br />
        <br />
        {formData.odc1.contact_name && (
          <>
            <p>Kind Attn: {formData.odc1.contact_name}</p>
            <p>Mob No: {formData.odc1.contact_number}</p>
          </>
        )}
        <br />
        <br />
        <p>Dear Sir,</p>
        <br />
        <p>
          Please receive the goods in good condition and acknowledge the same.
        </p>
        <br />
      </div>
      <div className="table">
        <table className="dc-table">
          <thead>
            <tr>
              <th>Sl No.</th>
              <th style={{ width: "250px" }}>Description of Goods</th>
              <th>PO Sl. No.</th>
              <th>No. of packs</th>
              <th>Pack Size</th>
              <th>Total Qty</th>
              <th>UOM</th>
              <th>Batch No.</th>
              {/* <th>COC No.</th> */}
            </tr>
          </thead>
          <tbody>
            {groupedData.map((group, groupIndex) => {
              return group.items.map((data, index) => {
                const { numericValue: packSize, unit } = stripUnits(
                  data.pack_size
                )

                console.log(`Debug - DC Item ${data.po_sl_no}:`, {
                  po_sl_no: data.po_sl_no,
                  number_of_packs: data.number_of_packs,
                  pack_size: data.pack_size,
                  qty_delivered: data.qty_delivered,
                  displayed_no_of_packs: data.number_of_packs || 0,
                  displayed_total_qty: data.qty_delivered,
                })

                return (
                  <tr key={groupIndex + "-" + index}>
                    {index === 0 && (
                      <>
                        <td rowSpan={group.items.length}>{group.sl_no}</td>
                        <td rowSpan={group.items.length}>{group.prod_desc}</td>
                      </>
                    )}
                    <td className="a-right">{data.po_sl_no}</td>
                    <td className="a-right">{data.number_of_packs || 0}</td>
                    <td className="a-right">{data.pack_size}</td>
                    <td className="a-right">{data.qty_delivered}</td>
                    <td>{unit}</td>
                    <td className="a-right">{data.batch}</td>
                    {/* <td>{data.coc}</td> */}
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>
      <div className="gst_no">
        <br />
        <h3>MATCON GST NO: 29AAYFM3774F1ZJ</h3>
        <br />
        <br />
        <br />
      </div>
      <div className="page-break">
        <div className="signature">
          <div className="matcon-signature">
            <h3>For MATCON</h3>
            <br />
            <br />
            <br />
            <br />
            <h3>Authorized Signatory</h3>
          </div>
          <div className="customer-signature">
            <h3>Customer Signature</h3>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DcPrint({ formData }) {
  const componentRef = useRef()

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  })

  const DcReportComponent = React.forwardRef((props, ref) => (
    <div ref={ref} className="dc-report">
      <DcReportC ref={ref} formData={props.formData} />
    </div>
  ))

  return (
    <div>
      <div>
        <button onClick={handlePrint}>Print this out!</button>
      </div>
      <div className="dc-report-container" ref={componentRef}>
        <DcReportComponent formData={formData} />
      </div>
    </div>
  )
}
