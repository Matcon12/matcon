export default function POTable({
  po_data,
  gr,
  total_qty,
  total_taxable_value,
  total_cgst,
  total_sgst,
  total_igst,
  poTableKitChanges,
}) {
  console.log("po_data ", po_data, poTableKitChanges)
  console.log("Debug - First item in po_data:", po_data[0])
  console.log("Debug - All po_data keys:", Object.keys(po_data[0] || {}))

  const calculateTotal = (qty, price) => {
    const quantity = parseFloat(qty)
    const unitPrice = parseFloat(price)
    if (isNaN(quantity) || isNaN(unitPrice)) {
      return "Invalid data"
    }
    return (quantity * unitPrice).toFixed(2)
  }

  const calculateTotalQuantity = po_data
    .filter((item) => item.po_no)
    .reduce((sum, item) => {
      const { numericValue: packSize } = stripUnits(item.pack_size)
      const quantity =
        item.po_sl_no && item.po_sl_no.includes(".")
          ? parseFloat(item.number_of_packs || 0) * packSize
          : parseFloat(item.number_of_packs || item.qty_delivered || 0)
      return sum + quantity
    }, 0)

  function stripUnits(value) {
    const numericValue = parseFloat(value.replace(/[^\d.-]/g, ""))
    const unit = value.replace(/[\d\s.-]/g, "")
    return { numericValue, unit }
  }

  return (
    <table className="po-table">
      <thead>
        <tr>
          <th className="col1">Sl. #</th>
          <th className="col2" style={{ textAlign: "center" }}>
            Description of Goods
          </th>
          <th className="col3">PO Sl.#</th>
          <th className="col4" style={{ textAlign: "center" }}>
            HSN Code
          </th>
          <th className="col5" style={{ textAlign: "center" }}>
            QTY
          </th>
          <th className="col15" style={{ textAlign: "center" }}>
            UoM
          </th>
          {/* <th className="col6">Pk Sz/UOM</th> */}
          <th className="col7" style={{ textAlign: "center" }}>
            Unit Price
          </th>
          <th className="col8" style={{ textAlign: "center" }}>
            Taxable Amount
          </th>
          {/* <th className="col9">CGST Rate (%)</th> */}
          <th className="col10" style={{ textAlign: "center" }}>
            CGST @{gr.cgst_rate}%
          </th>
          {/* <th className="col11">SGST Rate (%)</th> */}
          <th className="col12" style={{ textAlign: "center" }}>
            SGST @{gr.sgst_rate}%
          </th>
          {/* <th className="col13">IGST Rate (%)</th> */}
          <th className="col14" style={{ textAlign: "center" }}>
            IGST @{gr.igst_rate}%
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="col1 vertical-align-top"></td>
          <td className="col2 vertical-align-top"></td>
          <td className="col3 vertical-align-top"></td>
          <td className="col4 vertical-align-top"></td>
          {/* <td className="col15 vertical-align-top"></td> */}
          <td className="col5 vertical-align-top"></td>
          <td className="col6 vertical-align-top"></td>
          <td className="col7 vertical-align-top"></td>
          <td className="col8 vertical-align-top"></td>
          {/* <td className="col9 vertical-align-top"></td> */}
          <td className="col10 vertical-align-top"></td>
          {/* <td className="col11 vertical-align-top"></td> */}
          <td className="col12 vertical-align-top"></td>
          {/* <td className="col13 vertical-align-top"></td> */}
          <td className="col14 vertical-align-top"></td>
        </tr>
        {po_data.map((data, index) => {
          const { numericValue: packSize, unit } = stripUnits(data.pack_size)
          console.log(`Debug - Item ${index}:`, {
            po_sl_no: data.po_sl_no,
            qty_delivered: data.qty_delivered,
            number_of_packs: data.number_of_packs,
            pack_size: data.pack_size,
            displayed_qty: data.number_of_packs || data.qty_delivered,
          })
          return (
            <tr key={index}>
              <td className="col1">{index + 1}</td>
              <td className="col2">
                {data.prod_desc}
                {data.additional_desc ? " " + data.additional_desc : ""}
              </td>
              <td className="col3">
                {["fr", "ins", "oc"].includes(data.po_sl_no)
                  ? ""
                  : data.po_sl_no}
              </td>
              <td className="col4">{data.hsn}</td>
              {/* <td className="col15">{data.pack_size}</td> */}
              <td className="col5">
                {!data.prod_desc.startsWith("Other Charges") &&
                  data.prod_desc !== "Insurance Charges" &&
                  data.prod_desc !==
                    "Packing forwarding with Freight charges" &&
                  (data.po_sl_no && data.po_sl_no.includes(".")
                    ? (data.number_of_packs * packSize).toFixed(2)
                    : data.number_of_packs || data.qty_delivered)}
              </td>
              <td className="col6">{unit}</td>
              <td className="col7">{data.unit_price.toFixed(2)}</td>
              <td className="col8">
                {calculateTotal(data.qty_delivered, data.unit_price)}
              </td>
              {/* <td className="col9">
                {parseInt(total_cgst) === 0 ? "" : gr.cgst_rate}
              </td> */}
              <td className="col10">
                {parseInt(total_cgst) === 0 ? "" : data.cgst_price.toFixed(2)}
              </td>
              {/* <td className="col11">
                {parseInt(total_sgst) === 0 ? "" : gr.sgst_rate}
              </td> */}
              <td className="col12">
                {parseInt(total_sgst) === 0 ? "" : data.sgst_price.toFixed(2)}
              </td>
              {/* <td className="col13">
                {parseInt(total_igst) === 0 ? "" : gr.igst_rate}
              </td> */}
              <td className="col14">
                {parseInt(total_igst) === 0 ? "" : data.igst_price.toFixed(2)}
              </td>
            </tr>
          )
        })}
        <tr>
          <td className="col1"></td>
          <td className="col2"></td>
          <td className="col3" colSpan={2}>
            Total:
          </td>
          {/* <td className="col5">{total_qty}</td> */}
          <td className="col5">{calculateTotalQuantity.toFixed(2)}</td>
          <td className="col15"></td>
          <td className="col7"></td>
          <td className="col8">
            {/* {total_taxable_value} */}
            {(
              total_taxable_value - poTableKitChanges.totalTaxableValue
            ).toFixed(2)}
          </td>
          {/* <td className="col9"></td> */}
          <td className="col10">
            {parseInt(total_cgst) == 0
              ? ""
              : // : total_cgst}
                (total_cgst - poTableKitChanges.totalCgst).toFixed(2)}
          </td>
          {/* <td className="col11"></td> */}
          <td className="col12">
            {parseInt(total_sgst) == 0
              ? ""
              : // : total_sgst}
                (total_sgst - poTableKitChanges.totalSgst).toFixed(2)}
          </td>
          {/* <td className="col13"></td> */}
          <td className="col14">
            {parseInt(total_igst) == 0
              ? ""
              : // : total_igst}
                (total_igst - poTableKitChanges.totalIgst).toFixed(2)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}
