import { DatePicker, Space, Select } from "antd"
import { useState, useEffect } from "react"
import dayjs from "dayjs"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faTrash,
  faArrowsRotate,
  faPlus,
} from "@fortawesome/free-solid-svg-icons"
import "./ProductDetails.css"
import AutoCompleteComponent from "../../components/AutoComplete/AutoCompleteComponent"
import api from "../../api/api.jsx"
import useDebounce from "../../hooks/useDebounce.jsx"
import KitProducts from "./KitProducts.jsx"
import { format, parse } from "date-fns"
import { ToastContainer, toast } from "react-toastify"

export default function ProductDetails({
  index,
  isKit,
  setIsKit,
  formData,
  setFormData,
  handleChange,
  suggestions,
  filteredSuggestions,
  setFilteredSuggestions,
  onProductDateChange,
  setTotal,
  handleProductDelete,
  handleProductClear,
  kit,
  setKit,
}) {
  const initialProductDetails = {
    poSlNo: "",
    prodId: "",
    packSize: "",
    productDesc: "",
    msrr: "",
    uom: "",
    hsn_sac: "",
    quantity: "",
    unitPrice: "",
    totalPrice: "",
    deliveryDate: null,
  }

  useEffect(() => {
    let total = parseFloat(formData[index].quantity * formData[index].unitPrice)

    setTotal(total.toFixed(2), index)
  }, [formData[index].quantity, formData[index].unitPrice])

  const productDateHandle = (date, dateStr) => {
    onProductDateChange(date, index, dateStr)
  }

  const debouncedProdId = useDebounce(formData[index].prodId, 100)
  const [qtyUom, setQtyUom] = useState(null); // For deriving the PkSz and UoM
  
  const [popup, setPopup] = useState(false)
  const [kitQuantity, setKitQuantity] = useState("")

  const onSubProductDateChange = (date, index, dateStr) => {
    const parsedPoDate = parse(formData.poDate, "dd-MM-yyyy", new Date())
    const formattedPoDate = format(parsedPoDate, "dd-MM-yyyy")
    const parsedDeliveryDate = parse(dateStr, "dd-MM-yyyy", new Date())
    const formattedDeliveryDate = format(parsedDeliveryDate, "dd-MM-yyyy")

    setKit(
      kit.map((item, idx) => {
        if (idx === index) {
          return {
            ...item,
            deliveryDate: parsedPoDate <= parsedDeliveryDate ? dateStr : "",
          }
        }
        return item
      })
    )
  }

  function parsePackSize(pk_Sz) {    
    //const regex = /^(\d+|\d*\.\d+)\s*(\w+)$/
    const regex = /^(\d+|\d*\.\d+)\s*(Ltr|Kg|No\.)$/;
  
    const match = pk_Sz.match(regex)
  
    console.log("Match:",match)
    if (match) {
      console.log("PkSz:",match[1],"UoM:",match[2])
      return {
        qty: parseFloat(match[1]),
        u_o_m: match[2],
      }
    } else {
      throw new Error("Invalid pack size format")
      return
    }
  }

  useEffect(() => {
    if (!debouncedProdId) return
    api
      .get("/packSize", {
        params: {
          prodId: debouncedProdId,
        },
      })
      .then((response) => {
        const parsedPkSz = parsePackSize(response.data.pack_size);
        console.log("Pack:", parsedPkSz.qty, "UoM:", parsedPkSz.u_o_m);
        setQtyUom(parsedPkSz); // Store in state

        setFormData(
          formData.map((productDetail, idx) => {
            if (idx === index) {
              return {
                ...productDetail,
                packSize: response.data.pack_size,
                productDesc: response.data.prod_desc,
                uom : parsedPkSz.u_o_m
              }
            }
            return productDetail
          })
        )
      })
      .catch((error) => {
        console.log(error.response.data.error)
      })
    if (debouncedProdId.startsWith("KIT")) {
      setPopup(true)
    }
  }, [debouncedProdId])

  const handleQtyChange = (e) => {
    const { name, value } = e.target
    console.log("OnBlur-handleQtyChange",name,value,qtyUom?.qty, qtyUom?.u_o_m)

    // Ensure that value is a valid, positive integer
    const qnty = parseFloat(value);
    if (isNaN(qnty) || qnty <= 0) {
      toast.error("Quantity must be a positive number");
      e.target.focus();
      return;
    }
    // Validate quantity against pack size
    if (qnty < qtyUom.qty || qnty % qtyUom.qty !== 0) {
      toast.error(`Quantity must be a multiple of Pack Size (${qtyUom.qty} ${qtyUom.u_o_m})`);
      e.target.focus();
      return;
    }
  }

  const handlePkszChange = (idx,e) => {
    const {name, value} = e.target
    if (formData[index].prodId.startsWith("KIT")) {
      try {
        const pkUom = parsePackSize(formData[index].packSize);
        console.log("Pk:", pkUom.qty, "UoM:", pkUom.u_o_m);
        setQtyUom(pkUom); // Store in state                          
        setFormData(                                             
          formData.map((productDetail, index) => {               
            if (idx === index) {                                 
              return {                                           
                ...productDetail,                                
                packSize: pkUom?.qty + " " + pkUom?.u_o_m,     
                uom: pkUom?.u_o_m,                              
              }                                                  
            }                                                    
            return productDetail                                 
          })                                                     
        )                                                      
      } catch (error) {
        console.error("Error parsing pack size:", error.message);
        toast.error("Invalid Pack Size format");
        setFormData(                                             
          formData.map((productDetail, index) => {               
            if (idx === index) {                                 
              return {                                           
                ...productDetail,                                
                packSize: qtyUom?.qty + " " + qtyUom?.u_o_m,     
                uom: qtyUom?.u_o_m,                              
              }                                                  
            }                                                    
            return productDetail                                 
          })                                                     
        )                                                      
      }
    } else {
        console.log("PackSize can be changed only for KIT"); 
        toast.error("PackSize can be changed only for KIT");
        setFormData(
          formData.map((productDetail, index) => {
            if (idx === index) {
              return {
                ...productDetail,
                packSize: qtyUom?.qty + " " + qtyUom?.u_o_m,
                uom: qtyUom?.u_o_m,
              }
            }
            return productDetail
          })
        )
    }
  }

  const handlePopupChange = (e) => {
    const { name, value } = e.target

    if (value < 2) {
      toast.error("KIT must have at least 2 components")
      return
    }
    setKitQuantity(value)
  }

  const handlePopupSubmit = (e) => {
    e.preventDefault()

    // Get the last poSlNo from the formData or initialize it to 0 if formData is empty
    const lastPoSlNo =
      formData.length > 0 ? formData[formData.length - 1].poSlNo : "0"

    const new_poSlNo = (index) => {
      let newPoSlNo

      if (lastPoSlNo.includes("/")) {
        // Handle fractional part
        const [wholePart, fractionPart] = lastPoSlNo.split("/")
        const newFractionPart = (
          parseFloat(fractionPart) +
          (index + 1) * 0.1
        ).toFixed(1)
        newPoSlNo = `${wholePart}/${newFractionPart}`
      } else {
        // Regular case
        newPoSlNo = (parseFloat(lastPoSlNo) + (index + 1) * 0.1).toFixed(1)
      }
      return newPoSlNo
    }

    // Create new entries based on kitQuantity
    const newEntries = Array.from({ length: kitQuantity }, (_, index) => ({
      poSlNo: new_poSlNo(index),
      prodId: "",
      packSize: "",
      productDesc: "",
      msrr: "",
      uom: "",
      hsn_sac: "",
      quantity: "",
      unitPrice: 0,
      totalPrice: 0,
      deliveryDate: null,
    }))

    // Update the formData state with new entries
    setFormData([...formData, ...newEntries])
    console.log(...Array(kitQuantity).fill(0))
    setIsKit((prevData) => {
      const updatedData = [...prevData]
      for (let i = 0; i < kitQuantity; i++) {
        updatedData.push(0)
      }
      console.log(updatedData)
      return updatedData
    })
    setPopup(false)
  }

  const checkKit = isKit[index]

  return (
    <>
      <hr />
      <div className="product-desc-only-inputs">
        <div className="productDescContainer">
          <div>
            <input
              type="text"
              required={true}
              name="poSlNo"
              value={formData[index].poSlNo}
              onChange={(e) => handleChange(index, e)}
              placeholder=" "
            />
            <label alt="Enter the PO SL No" placeholder="PO SL No"></label>
          </div>
          {/* {console.log("main data: ", formData)} */}
          <div className="autocomplete-wrapper">
            <AutoCompleteComponent
              data={suggestions}
              mainData={formData}
              setMainData={setFormData}
              filteredData={filteredSuggestions}
              setFilteredData={setFilteredSuggestions}
              name="prodId"
              placeholder="Product Code"
              search_value="prod_id"
              array={true}
              nested={true}
              index={index}
            />
          </div>
          <div>
            <input
              type="text"
              name="packSize"
              value={formData[index].packSize}
              onChange={(e) => handleChange(index, e)}
              onBlur={(e) => handlePkszChange(index, e)}
              placeholder=" "
              //readOnly
            />
            <label alt="Enter the Pack Size" placeholder="Pack Size"></label>
          </div>
          <div className="grid-item-textarea">
            <textarea
              name="productDesc"
              value={formData[index].productDesc}
              onChange={(e) => handleChange(index, e)}
              placeholder=" "
            ></textarea>
            <label
              alt="Enter the Product Description"
              placeholder="Product Description"
            ></label>
          </div>
          <div className="grid-item-textarea">
            <input
              type="text"
              name="msrr"
              value={formData[index].msrr}
              onChange={(e) => handleChange(index, e)}
              placeholder=" "
            />
            <label
              alt="Enter the MSRR Number"
              placeholder="Specifications"
            ></label>
          </div>
          <div>
            <input
              type="number"
              step="0.01"
              name="quantity"
              value={formData[index].quantity}
              onChange={(e) => handleChange(index, e)}
              onBlur={(e) => handleQtyChange(e)}
              placeholder=" "
            />
            <label alt="Enter the Quantity" placeholder="Quantity"></label>
          </div>
          {checkKit ? (
            <div>
              <input
                type="number"
                name="unitPrice"
                value={formData[index].unitPrice}
                onChange={(e) => handleChange(index, e)}
                placeholder=" "
              />
              <label
                alt="Enter the Unit Price"
                placeholder="Rate per UOM"
              ></label>
            </div>
          ) : null}

          {checkKit ? (
            <div>
              <input
                type="number"
                name="totalPrice"
                value={formData[index].totalPrice}
                onChange={(e) => handleChange(index, e)}
                placeholder=" "
                readOnly
              />
              <label
                alt="Enter the Total Price"
                placeholder="Total Price"
              ></label>
            </div>
          ) : null}
          {checkKit ? (
            <div>
              <input
                type="text"
                name="hsn_sac"
                value={formData[index].hsn_sac}
                onChange={(e) => handleChange(index, e)}
                placeholder=" "
              />
              <label
                alt="Enter the HSN/SAC"
                placeholder="HSN/SAC Code:"
              ></label>
            </div>
          ) : null}
          {/*<div className="input-container">
            <select
              name="uom"
              value={formData[index].uom}
              onChange={(e) => handleChange(index, e)}
            >
              <option value="" disabled>
                Select an option
              </option>
              <option value="Ltr">Ltr</option>
              <option value="Kg">Kg</option>
              <option value="No.">No.</option>
            </select>
            <label alt="Select an Option" placeholder="UOM"></label>
          </div>*/}
          <div>
            <input
              type="text"
              name="uom"
              value={formData[index].uom}
              placeholder=" "
            />
            <label alt="Enter the UoM" placeholder="UOM"></label>
          </div>
          
          {checkKit ? (
            <div className="deliveryDate">
              <div className="datePickerContainer">
                <Space direction="vertical">
                  <DatePicker
                    onChange={productDateHandle}
                    value={
                      formData[index].deliveryDate
                        ? dayjs(formData[index].deliveryDate, "DD-MM-YYYY")
                        : ""
                    }
                    format="DD-MM-YYYY"
                    placeholder={"Delivery Date"}
                  />
                  {formData[index].deliveryDate && (
                    <label className="deliveryLabel">Delivery Date</label>
                  )}
                </Space>
              </div>
            </div>
          ) : null}
        </div>
        <div className="clearAndDeleteContainer">
          {index == 0 && (
            <div className="clear_current_product">
              <FontAwesomeIcon
                className="clearButton"
                icon={faArrowsRotate}
                onClick={() => handleProductClear(index)}
              />
            </div>
          )}
          {index != 0 ? (
            <>
              <div className="delete_current_product">
                <FontAwesomeIcon
                  className="deleteButton"
                  icon={faTrash}
                  onClick={() => handleProductDelete(index)}
                />
              </div>
              <div className="clear_current_product">
                <FontAwesomeIcon
                  className="clearButton"
                  icon={faArrowsRotate}
                  onClick={() => handleProductClear(index)}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
      {popup && (
        <div className="popup-overlay" onClick={() => setPopup(false)}>
          <div className="popup-container" onClick={(e) => e.stopPropagation()}>
            <form>
              <label htmlFor="kit-quantity">
                Enter the number of products in the kit:
              </label>
              <input
                type="number"
                id="kit-quantity"
                name="kitQuantity"
                min="1"
                required
                onChange={handlePopupChange}
              />
              <div className="popup-actions">
                <button
                  className="popUpSubmit"
                  type="button"
                  onClick={handlePopupSubmit}
                >
                  Submit
                </button>
                <button
                  className="popUpCancel"
                  type="button"
                  onClick={() => setPopup(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* input for kit component */}
      {/* {kit &&
        formData[index].poSlNo &&
        kit
          .filter((kitItem) =>
            kitItem.poSlNo.startsWith(formData[index].poSlNo)
          )
          .map((kitItem, index) => {
            return (
              <KitProducts
                index={index}
                formData={kit}
                setFormData={setKit}
                suggestions={suggestions}
                filteredSuggestions={filteredSuggestions}
                setFilteredSuggestions={setFilteredSuggestions}
                subProductDateHandle={onSubProductDateChange}
              />
            )
          })} */}
    </>
  )
}