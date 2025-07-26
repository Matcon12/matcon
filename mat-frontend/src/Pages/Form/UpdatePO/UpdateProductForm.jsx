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

  const handleChange = (e) => {
    const { name, value } = e.target
    setKitData((prevData) =>
      prevData.map((item, i) =>
        i === index ? { ...item, [name]: value } : item
      )
    )
  }

  function parsePackSize(pk_Sz) {
    const regex = /^(\d+|\d*\.\d+)\s*(Ltr|Kg|No\.)$/
    const match = pk_Sz.match(regex)

    console.log("Match:", match)
    if (match) {
      console.log("PkSz:", match[1], "UoM:", match[2])
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
    console.log("Pack:", qtyUom?.qty, "UoM:", qtyUom?.u_o_m)

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
  }

  //useEffect(() => {
  //  api
  //    .get("/packSize", {
  //      params: {
  //        prodId: data.prod_code,
  //      },
  //    })
  //    .then((response) => {
  //      console.log(response.data)
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
  //      console.log(error.response.data.error)
  //    })
  //}, [data.prod_code])

  useEffect(() => {
    setKitData((prevData) => {
      return prevData?.map((item) => {
        if (data.po_sl_no === item.po_sl_no) {
          console.log("poslno:", data.po_sl_no)
          return {
            ...item,
            qty_balance: data.quantity - data.qty_sent,
          }
        }
        return item
      })
    })
  }, [data.qty_sent, data.quantity])

  return (
    <>
      <hr />
      <h4>Kit component: {index + 1}</h4>
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
            /*required={true}*/
            name="quantity"
            value={data.quantity}
            onChange={handleChange}
            onBlur={handleQtyChange}
            placeholder=" "
          />
          <label alt="Enter the Quantity" placeholder="Quantity"></label>
        </div>
        <div>
          <input
            type="number"
            /*required={true}*/
            name="qty_sent"
            value={data.qty_sent}
            onChange={handleChange}
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
