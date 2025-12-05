import "./UpdatePO.css"
import { Link } from "react-router-dom"
import api from "../../../api/api.jsx"
import { useState, useEffect } from "react"
import { DatePicker, Space } from "antd"
import dayjs from "dayjs"
// import possibleValues from "../../../../data.js"
import AutoCompleteUtil from "../../../reuse/ui/AutoCompleteUtil.jsx"
import { format, addYears, parse, isAfter } from "date-fns"
import { ToastContainer, toast } from "react-toastify"

import "react-toastify/dist/ReactToastify.css"
import UpdateProductForm from "./UpdateProductForm.jsx"

export default function UpdatePO() {
  const initialSearchInputs = {
    customer_id: "",
  }
  const intialSearchData = {
    pono: "",
    podate: "",
    po_validity: "",
    quote_id: "",
    customer_id: "",
    consignee_id: "",
    po_sl_no: "",
    prod_code: "",
    prod_desc: "",
    additional_desc: "",
    pack_size: "",
    uom: "",
    quantity: 0.0,
    staggered_delivery: "",
    unit_price: 0.0,
    total_price: 0.0,
    qty_sent: 0.0,
    qty_balance: 0.0,
    delivery_date: null,
    // omat: "",
    hsn_sac: "",
    location: "",
  }

  const [searchInputs, setSearchInputs] = useState(initialSearchInputs)
  const [searchData, setSearchData] = useState(intialSearchData)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [purchaseOrder, setPurchaseOrder] = useState()
  const [filteredPurchaseData, setFilteredPurchaseData] = useState()
  const [success, setSucess] = useState()
  const [poslnos, setPoslnos] = useState()
  const [filteredPoSlNo, setFilteredPoSlNo] = useState()
  const [filteredSuggestions, setFilteredSuggestions] = useState()
  const [consigneeData, setConsigneeData] = useState()
  const [filteredConsigneeData, setFilteredConsigneeData] = useState()
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const [kitData, setKitData] = useState()
  const [isKit, setIsKit] = useState(false)

  // Function to validate common columns consistency across all records
  const validateCommonColumnsConsistency = (mainData, kitData) => {
    if (!mainData || !kitData || kitData.length === 0) return true

    const commonFields = [
      "podate",
      "po_validity",
      "quote_id",
      "consignee_id",
      "location",
    ]
    const firstRecord = mainData

    for (const kitItem of kitData) {
      for (const field of commonFields) {
        if (firstRecord[field] !== kitItem[field]) {
          console.warn(
            `Inconsistent ${field}: main=${firstRecord[field]}, kit=${kitItem[field]}`
          )
          return false
        }
      }
    }
    return true
  }

  useEffect(() => {
    api.get("/getCustomerData").then((response) => {
      setConsigneeData(response.data.customerData)
    })
    api.get("/getPurchaseOrder").then((response) => {
      setPurchaseOrder(response.data.distinct_pono)
    })
    api.get("/getProductCodes").then((response) => {
      setSuggestions(response.data.prod_code)
    })

    setIsInitialLoad(true)
  }, [])

  const searchDataReset = () => {
    setSearchData(initialSearchInputs)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    searchData.pono && searchData.po_sl_no
      ? api
          .get("/getDataPoCust", {
            params: {
              cust_id: searchData.customer_id,
              po_no: searchData.pono,
              po_sl_no: searchData.po_sl_no,
            },
          })
          .then((response) => {
            let data = response.data.data[0]

            setKitData(response.data.filtered_data)
            setIsKit(response.data.is_kit || false)

            // Show appropriate message based on product type
            if (response.data.is_kit) {
              toast.info(
                `KIT product detected with ${
                  response.data.filtered_data?.length || 0
                } components`
              )
            } else if (response.data.filtered_data?.length > 0) {
              toast.info(
                `Regular product with ${response.data.filtered_data?.length} hierarchical items`
              )
            }

            // Validate common columns consistency
            const isConsistent = validateCommonColumnsConsistency(
              data,
              response.data.filtered_data
            )
            if (!isConsistent) {
              toast.warning(
                "Inconsistent common columns detected across related records. The system will synchronize them during update."
              )
            }

            const parsedDate = parse(data.podate, "yyyy-MM-dd", new Date())
            const formattedPoDate = format(parsedDate, "dd-MM-yyyy")

            const parsedValidityDate = data.po_validity
              ? parse(data.po_validity, "yyyy-MM-dd", new Date())
              : null
            const formattedValidityDate = parsedValidityDate
              ? format(parsedValidityDate, "dd-MM-yyyy")
              : null

            const parsedDeliveryDate = data.delivery_date
              ? parse(data.delivery_date, "yyyy-MM-dd", new Date())
              : null

            const formattedDeliveryDate = parsedDeliveryDate
              ? format(parsedDeliveryDate, "dd-MM-yyyy")
              : null

            setSearchData({
              pono: data.pono,
              podate: formattedPoDate,
              po_validity: formattedValidityDate,
              quote_id: data.quote_id,
              customer_id: data.cust_id,
              consignee_id: data.consignee_id,
              po_sl_no: data.po_sl_no,
              prod_code: data.prod_code,
              prod_desc: data.prod_desc,
              additional_desc: data.additional_desc,
              pack_size: data.pack_size,
              staggered_delivery: data.staggered_delivery,
              quantity: parseFloat(data.quantity),
              unit_price: parseFloat(data.unit_price),
              total_price: parseFloat(data.total_price),
              qty_sent: parseFloat(data.qty_sent),
              qty_balance: parseFloat(data.qty_balance),
              delivery_date: formattedDeliveryDate,
              hsn_sac: data.hsn_sac,
              // omat: data.omat,
              uom: data.uom,
              location: data.location,
            })
          })
          .catch((error) => {
            setSearchData((prevSearchData) => ({
              ...prevSearchData,
              customer_id: searchData.customer_id,
              po_sl_no: e.target.value,
              pono: "",
              podate: "",
              po_validity: "",
              quote_id: "",
              consignee_id: "",
              prod_code: "",
              prod_desc: "",
              additional_desc: "",
              pack_size: "",
              staggered_delivery: "",
              quantity: 0,
              unit_price: 0,
              total_price: 0,
              qty_sent: 0,
              qty_balance: 0,
              delivery_date: "",
              hsn_sac: "",
              // omat: "",
              location: "",
            }))
            toast.error("Error fetching the data")
          })
      : api
          .get("/getData", {
            params: {
              pono: searchData.pono,
              ...(searchData.po_sl_no && { po_sl_no: searchData.po_sl_no }),
            },
          })
          .then((response) => {
            const data = response.data.data

            setPoslnos(response.data.po_sl_nos)

            // Validate common columns consistency
            const isConsistent = validateCommonColumnsConsistency(
              data,
              response.data.filtered_data
            )
            if (!isConsistent) {
              toast.warning(
                "Inconsistent common columns detected across related records. The system will synchronize them during update."
              )
            }

            const parsedDate = parse(data.podate, "yyyy-MM-dd", new Date())
            const formattedPoDate = format(parsedDate, "dd-MM-yyyy")
            const validityDate = addYears(data.podate, 1)
            const formattedValidityDate = format(validityDate, "dd-MM-yyyy")
            const formattedDeliveryDate = data.delivery_date
              ? format(
                  parse(data.delivery_date, "yyyy-MM-dd", new Date()),
                  "dd-MM-yyyy"
                )
              : ""
            setSearchData({
              pono: data.pono,
              podate: formattedPoDate,
              po_validity: formattedValidityDate,
              quote_id: data.quote_id,
              customer_id: data.cust,
              consignee_id: data.consignee_id,
              po_sl_no: data.po_sl_no,
              prod_code: data.prod_code,
              prod_desc: data.prod_desc,
              additional_desc: data.additional_desc,
              pack_size: data.pack_size,
              staggered_delivery: data.staggered_delivery,
              quantity: parseFloat(data.quantity),
              unit_price: parseFloat(data.unit_price),
              total_price: parseFloat(data.total_price),
              qty_sent: parseFloat(data.qty_sent),
              qty_balance: parseFloat(data.qty_balance),
              delivery_date: formattedDeliveryDate,
              uom: data.uom,
              hsn_sac: data.hsn_sac,
              location: data.location,
            })

            // Set kit data and check if it's a kit product
            if (
              response.data.filtered_data &&
              response.data.filtered_data.length > 0
            ) {
              setKitData(response.data.filtered_data)
              setIsKit(true)
            } else {
              setKitData([])
              setIsKit(false)
            }

            // Mark initial load as complete
            setIsInitialLoad(false)

            const successMessage = searchData.po_sl_no
              ? `Successfully fetched data for PO Sl No: ${data.po_sl_no}`
              : "Successfully fetched data!!"
            toast.success(successMessage)
          })
          .catch((error) => {
            setIsInitialLoad(false) // Mark initial load as complete even on error
            toast.error("ERROR in Fetching Data")
          })
  }

  const resetDataForm = () => {
    setSearchData({
      pono: searchData.pono,
      podate: "",
      po_validity: "",
      quote_id: "",
      customer_id: searchData.customer_id,
      consignee_id: searchData.consignee_id,
      po_sl_no: "",
      prod_code: "",
      prod_desc: "",
      additional_desc: "",
      pack_size: "",
      uom: "",
      quantity: 0.0,
      staggered_delivery: "",
      unit_price: 0.0,
      total_price: 0.0,
      qty_sent: 0.0,
      qty_balance: 0.0,
      delivery_date: null,
      // omat: "",
      hsn_sac: "",
      location: "",
    })
  }

  const handleUpdate = (e) => {
    e.preventDefault()

    // Validate common columns before sending update
    const validateCommonColumns = (data) => {
      const required = ["podate", "location"]
      const missing = required.filter((field) => !data[field])
      if (missing.length > 0) {
        toast.error(`Missing required fields: ${missing.join(", ")}`)
        return false
      }
      return true
    }

    if (!validateCommonColumns(searchData)) {
      return
    }

    api
      .put("/updateForm", { searchInputs, searchData, kitData })
      .then((response) => {
        // Show success message with information about synchronized records
        if (response.data.message) {
          toast.success(response.data.message)
          // If kit components were updated, show additional info
          if (response.data.kit_updates && response.data.kit_updates > 0) {
            toast.info(
              `Successfully updated ${response.data.kit_updates} kit component(s)`
            )
          }
        } else {
          toast.success(
            `Form Updated Successfully for PO Sl No: ${searchData.po_sl_no}`
          )
        }
      })
      .catch((error) => {
        const errorMessage =
          error.response?.data?.error || "ERROR: Invalid/Missing Input Data"
        toast.error(errorMessage)
      })
  }

  const handleChangeData = (e) => {
    const { name, value } = e.target

    // Check if this is a common column
    const commonColumns = ["quote_id", "consignee_id", "location"]
    if (commonColumns.includes(name)) {
      handleCommonColumnChange(name, value)
    } else {
      setSearchData({
        ...searchData,
        [name]: ["quantity", "unit_price", "qty_sent", "qty_balance"].includes(
          name
        )
          ? parseFloat(value)
          : value,
      })
    }
  }

  const onDateChange = (date, dateString) => {
    // Handle empty string or null values when user clears the date
    const value = dateString && dateString.trim() !== "" ? dateString : null
    handleCommonColumnChange("podate", value)
  }

  const onDeliveryDateChange = (date, dateString) => {
    const poDateString = searchData.podate

    // Handle empty string or null values when user clears the date
    if (!dateString || dateString.trim() === "") {
      setSearchData((prevFormData) => ({
        ...prevFormData,
        delivery_date: null,
      }))
      return
    }

    // Parse the dates from "dd-MM-yyyy" format
    const poDate = parse(poDateString, "dd-MM-yyyy", new Date())
    const deliveryDate = parse(dateString, "dd-MM-yyyy", new Date())

    setSearchData((prevFormData) => ({
      ...prevFormData,
      delivery_date:
        isAfter(deliveryDate, poDate) ||
        format(deliveryDate, "dd-MM-yyyy") === format(poDate, "dd-MM-yyyy")
          ? dateString
          : "",
    }))
  }

  const onValidityDateChange = (date, dateString) => {
    // Handle empty string or null values when user clears the date
    const value = dateString && dateString.trim() !== "" ? dateString : null
    handleCommonColumnChange("po_validity", value)
  }

  // Helper function to handle common column changes
  const handleCommonColumnChange = (field, value) => {
    setSearchData((prev) => ({
      ...prev,
      [field]: value,
    }))

    // Optionally update kit data with the same common column value
    // This ensures consistency in the frontend state
    if (kitData && kitData.length > 0) {
      setKitData((prev) =>
        prev.map((item) => ({
          ...item,
          [field]: value,
        }))
      )
    }
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
    const qtyUom = parsePackSize(searchData.pack_size)

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

  // Function to calculate main kit quantity from kit components
  const calculateMainKitQuantity = (kitData) => {
    if (!kitData || kitData.length === 0) return 0

    return kitData.reduce((sum, component) => {
      const qty = parseFloat(component.quantity) || 0
      return sum + qty
    }, 0)
  }

  // Update main kit quantity when kit component quantities change
  useEffect(() => {
    if (isKit && kitData && kitData.length > 0) {
      const mainKitQuantity = calculateMainKitQuantity(kitData)

      setSearchData((prevData) => ({
        ...prevData,
        quantity: mainKitQuantity,
      }))
    }
  }, [kitData, isKit])

  useEffect(() => {
    const balance = searchData.quantity - searchData.qty_sent
    const total = parseFloat(
      searchData.quantity * searchData.unit_price
    ).toFixed(2)

    setSearchData((prevData) => ({
      ...prevData,
      qty_balance: balance,
      total_price: total,
    }))
  }, [searchData.qty_sent, searchData.quantity, searchData.unit_price])

  return (
    <div className="update-po-container">
      <div className="update-po-form-container">
        <div className="update-po-header-container">
          <h1>Update Customer Purchase Order</h1>
          <Link to="/purchase_order">New Entry</Link>
        </div>
        <div className="form-container">
          {/* fetching the data from the database to edit */}
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="update-po-input-styles">
              <div className="autocomplete-wrapper">
                <AutoCompleteUtil
                  data={purchaseOrder}
                  mainData={searchData}
                  setData={setPurchaseOrder}
                  setMainData={setSearchData}
                  // handleChange={handleChange}
                  filteredData={filteredPurchaseData}
                  setFilteredData={setFilteredPurchaseData}
                  name="pono"
                  placeholder="PO No."
                  search_value="pono"
                />
              </div>
              <div>
                <input
                  type="text"
                  // required={true}
                  value={searchData.customer_id}
                  name="customer_id"
                  //onChange={handleChange}
                  placeholder=" "
                  readOnly
                />
                <label
                  alt="Enter the customer Id"
                  placeholder="Customer ID"
                ></label>
              </div>
              <div className="autocomplete-wrapper">
                <AutoCompleteUtil
                  data={poslnos}
                  mainData={searchData}
                  setData={setPoslnos}
                  setMainData={setSearchData}
                  filteredData={filteredPoSlNo}
                  setFilteredData={setFilteredPoSlNo}
                  name="po_sl_no"
                  placeholder="PO Sl No."
                  search_value="po_sl_no"
                  //onchange={handleChange}
                />
              </div>

              <div className="update-po-button-container">
                <button type="submit" className="update-po-submit-btn">
                  Get Data
                </button>
              </div>
            </div>
          </form>
        </div>
        <div className="form-container">
          <form onSubmit={handleUpdate}>
            {/* {searchData.pono && ( */}
            <>
              <div className="update-po-input-styles">
                <div>
                  <div className="datePickerContainer">
                    <Space direction="vertical">
                      <DatePicker
                        onChange={onDateChange}
                        name="podate"
                        value={
                          searchData.podate
                            ? dayjs(searchData.podate, "DD-MM-YYYY")
                            : ""
                        }
                        format="DD-MM-YYYY"
                        placeholder={"PO Date"}
                        required={true}
                      />
                      {searchData.podate && (
                        <label className="poLabel">PO Date</label>
                      )}
                    </Space>
                  </div>
                </div>
                <div>
                  <div className="datePickerContainer">
                    <Space direction="vertical">
                      <DatePicker
                        onChange={onValidityDateChange}
                        name="po_validity"
                        value={
                          searchData.po_validity
                            ? dayjs(searchData.po_validity, "DD-MM-YYYY")
                            : ""
                        }
                        format="DD-MM-YYYY"
                        placeholder={"PO Validity"}
                      />
                      {searchData.po_validity && (
                        <label className="poLabel">PO Validity</label>
                      )}
                    </Space>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    /*required={true}*/
                    name="quote_id"
                    value={searchData.quote_id}
                    onChange={handleChangeData}
                    placeholder=" "
                  />
                  <label
                    alt="Enter the quote Id"
                    placeholder="Quote ID"
                  ></label>
                </div>
                <div className="autocomplete-wrapper">
                  <AutoCompleteUtil
                    data={consigneeData}
                    mainData={searchData}
                    setData={setConsigneeData}
                    setMainData={setSearchData}
                    filteredData={filteredConsigneeData}
                    setFilteredData={setFilteredConsigneeData}
                    name="consignee_id"
                    placeholder="Consignee ID"
                    search_value="cust_id"
                  />
                </div>
                {/*
                <div className="autocomplete-wrapper">
                  <AutoCompleteUtil
                    data={suggestions}
                    setData={setSuggestions}
                    mainData={searchData}
                    setMainData={setSearchData}
                    filteredData={filteredSuggestions}
                    setFilteredData={setFilteredSuggestions}
                    name="prod_code"
                    placeholder="Product Code"
                    search_value="prod_id"
                    readOnly
                  />
                </div>
                */}
                <div>
                  <input
                    type="text"
                    name="prod_code"
                    value={searchData.prod_code}
                    placeholder=" "
                    readOnly
                  />
                  <label
                    alt="Enter the Prod Code"
                    placeholder="Product Code"
                  ></label>
                </div>
                <div>
                  <select
                    name="location"
                    value={searchData.location}
                    onChange={handleChangeData}
                    required
                  >
                    <option value="HBL">Hebbal (HBL)</option>
                    <option value="ASP">Aerospace Park (ASP)</option>
                  </select>
                  <label alt="Select Location" placeholder="Location"></label>
                </div>
                <div className="specifications-span-2">
                  <textarea
                    name="prod_desc"
                    value={searchData.prod_desc}
                    onChange={handleChangeData}
                    placeholder=" "
                  ></textarea>
                  <label
                    alt="Enter the Product Description"
                    placeholder="Product Description"
                  ></label>
                </div>
                <div className="specifications-span-2">
                  <input
                    type="text"
                    /*required={true}*/
                    name="additional_desc"
                    value={searchData.additional_desc}
                    onChange={handleChangeData}
                    placeholder=" "
                  />
                  <label
                    alt="Enter the Additional Desc"
                    placeholder="Specifications"
                  ></label>
                </div>
                <div>
                  <input
                    type="text"
                    /*required={true}*/
                    name="pack_size"
                    value={searchData.pack_size}
                    //onChange={handleChangeData}
                    placeholder=" "
                    readOnly
                  />
                  <label
                    alt="Enter the Pack Size"
                    placeholder="Pack Size"
                  ></label>
                </div>
                <div className="input-container">
                  <input
                    type="text"
                    name="uom"
                    value={searchData.uom}
                    placeholder=" "
                  />
                  <label alt="Enter the UoM" placeholder="UOM"></label>
                </div>
                <div>
                  <input
                    type="number"
                    /*required={true}*/
                    name="quantity"
                    value={searchData.quantity}
                    onChange={handleChangeData}
                    onBlur={handleQtyChange}
                    placeholder=" "
                    readOnly={isKit && kitData && kitData.length > 0}
                    style={{
                      backgroundColor:
                        isKit && kitData && kitData.length > 0
                          ? "#f5f5f5"
                          : "white",
                      cursor:
                        isKit && kitData && kitData.length > 0
                          ? "not-allowed"
                          : "text",
                    }}
                  />
                  <label
                    alt="Enter the Quantity"
                    placeholder="Quantity"
                  ></label>
                  {isKit && kitData && kitData.length > 0 && (
                    <small
                      style={{
                        color: "#666",
                        fontSize: "12px",
                        marginTop: "4px",
                        display: "block",
                      }}
                    >
                      Auto-calculated from kit components
                    </small>
                  )}
                </div>
                {/* <div>
                  <input
                    type="text"
                    required={true}
                    name="staggered_delivery"
                    value={searchData.staggered_delivery}
                    onChange={handleChangeData}
                    placeholder=" "
                  />
                  <label
                    alt="Enter the Staggered Delivery"
                    placeholder="Staggered Delivery"
                  ></label>
                </div> */}
                <div>
                  <input
                    type="number"
                    /*required={true}*/
                    name="unit_price"
                    value={searchData.unit_price}
                    onChange={handleChangeData}
                    placeholder=" "
                    //                    readOnly
                  />
                  <label
                    alt="Enter the Unit Price"
                    placeholder="Rate per UOM"
                  ></label>
                </div>
                <div>
                  <input
                    type="number"
                    /*required={true}*/
                    name="total_price"
                    value={searchData.total_price}
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
                    type="number"
                    /*required={true}*/
                    name="qty_sent"
                    value={searchData.qty_sent}
                    onChange={handleChangeData}
                    placeholder=" "
                    // readOnly
                  />
                  <label
                    alt="Enter the quantity sent"
                    placeholder="Quantity Sent"
                  ></label>
                </div>
                <div>
                  <input
                    type="number"
                    /*required={true}*/
                    name="qty_bal"
                    value={searchData.qty_balance}
                    onChange={handleChangeData}
                    placeholder=" "
                    readOnly
                  />
                  <label
                    alt="Enter the Quantity Balance"
                    placeholder="Quantity Balance"
                  ></label>
                </div>
                <div>
                  <input
                    type="text"
                    /*required={true}*/
                    name="hsn_sac"
                    value={searchData.hsn_sac}
                    onChange={handleChangeData}
                    placeholder=" "
                  />
                  <label
                    alt="Enter the HSN_SAC Code"
                    placeholder="HSN_SAC Code"
                  ></label>
                </div>
                <div>
                  <div className="datePickerContainer">
                    <Space direction="vertical">
                      <DatePicker
                        onChange={onDeliveryDateChange}
                        value={
                          searchData.delivery_date
                            ? dayjs(searchData.delivery_date, "DD-MM-YYYY")
                            : ""
                        }
                        format="DD-MM-YYYY"
                        placeholder={"Delivery Date"}
                      />
                      {searchData.podate && (
                        <label className="poLabel">Delivery Date</label>
                      )}
                    </Space>
                  </div>
                </div>
              </div>
              {isKit && (
                <div
                  style={{
                    backgroundColor: "#e6f7ff",
                    border: "1px solid #91d5ff",
                    borderRadius: "4px",
                    padding: "12px",
                    margin: "16px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>📦</span>
                  <span style={{ fontWeight: "500", color: "#1890ff" }}>
                    This is a KIT product with {kitData?.length || 0} components
                  </span>
                </div>
              )}
              {isKit && (!kitData || kitData.length === 0) && (
                <div
                  style={{
                    backgroundColor: "#fff7e6",
                    border: "1px solid #ffd591",
                    borderRadius: "4px",
                    padding: "12px",
                    margin: "16px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>⚠️</span>
                  <span style={{ fontWeight: "500", color: "#fa8c16" }}>
                    KIT product detected but no components found
                  </span>
                </div>
              )}

              {isKit &&
                kitData &&
                kitData.length > 0 &&
                kitData.map((item, index) => {
                  return (
                    <UpdateProductForm
                      key={`kit-${index}`}
                      data={item}
                      kitData={kitData}
                      setKitData={setKitData}
                      index={index}
                    />
                  )
                })}
              <div>
                <p>{success}</p>
              </div>
              <div className="update-po-button-container">
                <button type="submit" className="update-po-submit-btn">
                  Update
                </button>
              </div>
            </>
            {/* )} */}
          </form>
        </div>
      </div>

      <ToastContainer />
    </div>
  )
}
