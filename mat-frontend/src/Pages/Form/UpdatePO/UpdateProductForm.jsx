import { useState, useEffect } from "react"
// import AutoCompleteComponent from "../../components/AutoComplete/AutoCompleteComponent"
import api from "../../../api/api"
// import KitProducts from "../ProductDetails/KitProducts"
import "./UpdateProductForm.css"
import { ToastContainer, toast } from "react-toastify"

export default function UpdateProductForm({
  data,
  kitData,
  setKitData,
  index,
  handleKitChange,
}) {
  const [suggestions, setSuggestions] = useState()
  const [filteredSuggestions, setFilteredSuggestions] = useState()
  useEffect(() => {
    api.get("/getProductCodes").then((response) => {
      setSuggestions(response.data.prod_code)
    })
  }, [])

  // Utility function to format numbers to 2 decimal places
  const formatToTwoDecimals = (value) => {
    const num = parseFloat(value)
    return isNaN(num) ? "0.00" : num.toFixed(2)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    // Format numeric fields to 2 decimal places
    let processedValue = value
    if (["quantity", "qty_sent", "qty_balance"].includes(name)) {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        processedValue = numValue // Don't format to 2 decimals on change, only on blur
      }
    }

    setKitData((prevData) => {
      const updatedData = prevData.map((item, i) =>
        i === index ? { ...item, [name]: processedValue } : item
      )
      return updatedData
    })
  }

  function parsePackSize(pk_Sz) {
    const regex = /^(\d+|\d*\.\d+)\s*(Ltr|Kg|No\.)$/
    const match = pk_Sz.match(regex)

    if (match) {
      return {
        qty: parseFloat(match[1]),
        u_o_m: match[2],
      }
    } else {
      throw new Error("Invalid pack size format")
      return
    }
  }

  const handleQtyChange = (e) => {
    const { name, value } = e.target
    const qtyUom = parsePackSize(data.pack_size)

    // Ensure that value is a valid, positive integer
    const qnty = parseFloat(value)
    if (isNaN(qnty) || qnty <= 0) {
      toast.error("Quantity must be a positive number")
      e.target.focus()
      return
    }
    // Validate quantity against pack size
    if (qnty < qtyUom.qty || qnty % qtyUom.qty !== 0) {
      toast.error(
        `Quantity must be a multiple of Pack Size (${qtyUom.qty} ${qtyUom.u_o_m})`
      )
      e.target.focus()
      return
    }

    // Update qty_balance when quantity changes
    setKitData((prevData) => {
      return prevData?.map((item) => {
        if (data.po_sl_no === item.po_sl_no) {
          const balance = qnty - (parseFloat(item.qty_sent) || 0)
          return {
            ...item,
            qty_balance: balance.toFixed(2),
          }
        }
        return item
      })
    })
  }

  //useEffect(() => {
  //  api
  //    .get("/packSize", {
  //      params: {
  //        prodId: data.prod_code,
  //      },
  //    })
  //    .then((response) => {
  //      const { uom } = parsePackSize(response.data.pack_size)
  //      setKitData((prevData) =>
  //        prevData.map((item, idx) =>
  //          index === idx
  //            ? {
  //                ...item,
  //                prod_code: data.prod_code,
  //                pack_size: response.data.pack_size,
  //                uom: uom,
  //              }
  //            : item
  //        )
  //      )
  //    })
  //    .catch((error) => {
  //    })
  //}, [data.prod_code])

  useEffect(() => {
    setKitData((prevData) => {
      return prevData?.map((item) => {
        if (data.po_sl_no === item.po_sl_no) {
          const balance = parseFloat(data.quantity) - parseFloat(data.qty_sent)
          return {
            ...item,
            qty_balance: isNaN(balance) ? "0.00" : balance.toFixed(2),
          }
        }
        return item
      })
    })
  }, [data.qty_sent, data.quantity])

  return (
    <>
      <hr />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <span style={{ fontSize: "14px" }}>🔧</span>
        <h4 style={{ margin: 0, color: "#1890ff" }}>
          Kit Component {index + 1}
        </h4>
      </div>
      <div className="updateProductFormContainer">
        <div>
          <input
            type="text"
            name="po_sl_no"
            value={data.po_sl_no}
            onChange={handleChange}
            placeholder=" "
          />
          <label alt="Enter the PO Sl No." placeholder="PO Sl No."></label>
        </div>{" "}
        {/*
        <div className="autocomplete-wrapper">
          <AutoCompleteComponent
            data={suggestions}
            mainData={kitData}
            setMainData={setKitData}
            filteredData={filteredSuggestions}
            setFilteredData={setFilteredSuggestions}
            name="prod_code"
            placeholder="Product Code"
            search_value="prod_id"
            array={true}
            index={index}
            // nested={true}
          />
        </div>*/}
        <div>
          <input
            type="text"
            name="prod_code"
            value={data.prod_code}
            placeholder=" "
            readOnly
          />
          <label alt="Enter the Prod Code" placeholder="Product Code"></label>
        </div>
        <div className="specifications-span-2">
          <textarea
            name="prod_desc"
            value={data.prod_desc}
            onChange={handleChange}
            placeholder=" "
          ></textarea>
          <label
            alt="Enter the Product Description"
            placeholder="Product Description"
          ></label>
        </div>
        {/* <div className="specifications-span-2">
          <textarea
            name="productDesc"
            value={data.prod_desc}
            onChange={handleChange}
            placeholder=" "
          ></textarea>
          <label
            alt="Enter the Product Description"
            placeholder="Product Description"
          ></label>
        </div> */}
        <div>
          <input
            type="text"
            /*required={true}*/
            name="pack_size"
            value={data.pack_size}
            onChange={handleChange}
            placeholder=" "
            // readOnly
          />
          <label alt="Enter the Pack Size" placeholder="Pack Size"></label>
        </div>
        <div className="input-container">
          <input type="text" name="uom" value={data.uom} placeholder=" " />
          <label alt="Select an Option" placeholder="UOM"></label>
        </div>
        <div>
          <input
            type="number"
            step="0.01"
            /*required={true}*/
            name="quantity"
            value={data.quantity}
            onChange={handleChange}
            onBlur={(e) => {
              // Format to 2 decimal places on blur
              const numValue = parseFloat(e.target.value)
              if (!isNaN(numValue)) {
                handleChange({
                  target: { name: "quantity", value: numValue.toFixed(2) },
                })
              }
              handleQtyChange(e)
            }}
            onWheel={(e) => e.target.blur()}
            placeholder=" "
          />
          <label alt="Enter the Quantity" placeholder="Quantity"></label>
        </div>
        <div>
          <input
            type="number"
            step="0.01"
            /*required={true}*/
            name="qty_sent"
            value={data.qty_sent}
            onChange={handleChange}
            onBlur={(e) => {
              // Format to 2 decimal places on blur
              const numValue = parseFloat(e.target.value)
              if (!isNaN(numValue)) {
                handleChange({
                  target: { name: "qty_sent", value: numValue.toFixed(2) },
                })
              }
            }}
            onWheel={(e) => e.target.blur()}
            placeholder=" "
          />
          <label alt="Enter the Quantity" placeholder="Quantity Sent"></label>
        </div>
        <div>
          <input
            type="number"
            /*required={true}*/
            name="qty_balance"
            value={data.qty_balance}
            onChange={handleChange}
            placeholder=" "
            readOnly
          />
          <label
            alt="Enter the Quantity"
            placeholder="Quantity Balance"
          ></label>
        </div>
      </div>
    </>
  )
}
