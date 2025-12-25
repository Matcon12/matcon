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
import AutoCompleteUtil from "../ui/AutoCompleteUtil.jsx"
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
  errors,
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
    const isKitComponent =
      formData[index].poSlNo && formData[index].poSlNo.includes(".")
    const unitPrice = isKitComponent ? 0 : formData[index].unitPrice || 0
    let total = parseFloat(formData[index].quantity * unitPrice)

    setTotal(total.toFixed(2), index)
  }, [formData[index].quantity, formData[index].unitPrice])

  const productDateHandle = (date, dateStr) => {
    onProductDateChange(date, index, dateStr)
  }

  const debouncedProdId = useDebounce(formData[index].prodId, 100)
  const [qtyUom, setQtyUom] = useState(null) // For deriving the PkSz and UoM

  const [popup, setPopup] = useState(false)
  const [kitQuantity, setKitQuantity] = useState("")

  const isKitComponent =
    formData[index].poSlNo && formData[index].poSlNo.includes(".")
  const isMainKit = formData[index].prodId?.startsWith("KIT") && !isKitComponent

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

  useEffect(() => {
    if (!debouncedProdId) return
    api
      .get("/packSize", {
        params: {
          prodId: debouncedProdId,
        },
      })
      .then((response) => {
        const parsedPkSz = parsePackSize(response.data.pack_size)
        console.log("Pack:", parsedPkSz.qty, "UoM:", parsedPkSz.u_o_m)
        setQtyUom(parsedPkSz) // Store in state

        setFormData(
          formData.map((productDetail, idx) => {
            if (idx === index) {
              const isKitComponent =
                productDetail.poSlNo && productDetail.poSlNo.includes(".")
              return {
                ...productDetail,
                packSize: response.data.pack_size,
                productDesc: response.data.prod_desc,
                uom: parsedPkSz.u_o_m,
                unitPrice: isKitComponent ? 0 : response.data.price || "",
              }
            }
            return productDetail
          })
        )
      })
      .catch((error) => {
        console.log(
          "API Error:",
          error?.response?.data?.error || error?.message || "Unknown error"
        )
      })
    if (debouncedProdId.startsWith("KIT")) {
      setPopup(true)
    }
  }, [debouncedProdId])

  const handleQtyChange = (e) => {
    const { name, value } = e.target
    console.log(
      "OnBlur-handleQtyChange",
      name,
      value,
      qtyUom?.qty,
      qtyUom?.u_o_m
    )

    // Ensure that value is a valid, positive integer
    const qnty = parseFloat(value)
    if (isNaN(qnty) || qnty <= 0) {
      toast.error("Quantity must be a positive number")
      e.target.focus()
      return
    }

    // Skip pack size validation for kit products
    if (formData[index].prodId.startsWith("KIT")) {
      return
    }

    // Validate quantity against pack size for non-kit products
    // if (qnty < qtyUom.qty || qnty % qtyUom.qty !== 0) {
    // If qnty is a fraction, this check fails, hence * 1000
    if (qnty < qtyUom.qty || (qnty * 1000) % (qtyUom.qty * 1000) !== 0) {
      toast.error(
        `Quantity must be a multiple of Pack Size (${qtyUom.qty} ${qtyUom.u_o_m})`
      )
      e.target.focus()
      return
    }
  }

  const handlePkszChange = (idx, e) => {
    const { name, value } = e.target
    if (formData[index].prodId.startsWith("KIT")) {
      try {
        const pkUom = parsePackSize(formData[index].packSize)
        console.log("Pk:", pkUom.qty, "UoM:", pkUom.u_o_m)
        setQtyUom(pkUom) // Store in state
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
        console.error("Error parsing pack size:", error.message)
        toast.error("Invalid Pack Size format")
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
      console.log("PackSize can be changed only for KIT")
      toast.error("PackSize can be changed only for KIT")
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

    // Create new entries based on kitQuantity (only required fields for kit components)
    const newEntries = Array.from({ length: kitQuantity }, (_, index) => ({
      poSlNo: new_poSlNo(index),
      prodId: "",
      packSize: "",
      productDesc: "",
      msrr: "",
      uom: "",
      quantity: "",
      unitPrice: 0,
      totalPrice: 0,
      hsn_sac: "",
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

  const handlePackSizeChange = (e) => {
    const { value: newUom } = e.target
    // Ensure we have a parsed packSize to derive quantity
    if (!qtyUom || !qtyUom.qty) {
      toast.error("Please select a product first to derive Pack Size")
      return
    }
    // Build the new packSize string from stored qty and newly selected UOM
    const newPackSize = `${qtyUom.qty} ${newUom}`

    // Update local qtyUom state
    setQtyUom((prev) => ({
      ...prev,
      u_o_m: newUom,
    }))

    // Update the formData for this line item
    setFormData((prevFormData) =>
      prevFormData.map((item, idx) =>
        idx === index
          ? {
              ...item,
              packSize: newPackSize,
              uom: newUom,
            }
          : item
      )
    )
  }

  return (
    <>
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
            <AutoCompleteUtil
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
              className={errors?.prodId ? "error-input" : ""}
            />
            {errors?.prodId && (
              <div className="error-message">{errors.prodId}</div>
            )}
          </div>
          {isMainKit ? (
            <div className="input-container">
              <select
                name="uom"
                value={formData[index].uom}
                onChange={handlePackSizeChange}
                required
              >
                <option value="" disabled>
                  Select an option
                </option>
                <option value="Ltr">Ltr</option>
                <option value="Kg">Kg</option>
                <option value="No.">No.</option>
              </select>
              <label alt="Select an Option" placeholder="UOM"></label>
            </div>
          ) : (
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
          )}
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
              onBlur={(e) => {
                // Format to 2 decimal places on blur
                const numValue = parseFloat(e.target.value)
                if (!isNaN(numValue)) {
                  handleChange(index, {
                    target: { name: "quantity", value: numValue.toFixed(2) },
                  })
                }
                handleQtyChange(e)
              }}
              onWheel={(e) => e.target.blur()}
              placeholder=" "
              className={errors?.quantity ? "error-input" : ""}
            />
            <label alt="Enter the Quantity" placeholder="Quantity"></label>
            {errors?.quantity && (
              <div className="error-message">{errors.quantity}</div>
            )}
          </div>
          {/* Show unit price, total price, and HSN/SAC only for non-kit components */}
          {!isKitComponent && (
            <>
              <div>
                <input
                  type="number"
                  name="unitPrice"
                  value={formData[index].unitPrice}
                  onChange={(e) => handleChange(index, e)}
                  placeholder=" "
                  className={errors?.unitPrice ? "error-input" : ""}
                />
                <label
                  alt="Enter the Unit Price"
                  placeholder="Rate per UOM"
                ></label>
                {errors?.unitPrice && (
                  <div className="error-message">{errors.unitPrice}</div>
                )}
              </div>

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
            </>
          )}

          {/* Show UOM for all products */}
          {!isMainKit && (
            <div>
              <input
                type="text"
                name="uom"
                value={formData[index].uom}
                placeholder=" "
              />
              <label alt="Enter the UoM" placeholder="UOM"></label>
            </div>
          )}

          {/* Show delivery date only for non-kit components */}
          {checkKit && !isKitComponent ? (
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
