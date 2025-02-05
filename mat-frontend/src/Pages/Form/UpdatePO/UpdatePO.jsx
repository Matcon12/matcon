import "./UpdatePO.css"
import { Link } from "react-router-dom"
import "../CreatePO/Customer.css"
import api from "../../../api/api.jsx"
import { useState, useEffect } from "react"
import { DatePicker, Space } from "antd"
import dayjs from "dayjs"
// import possibleValues from "../../../../data.js"
import AutoCompleteComponent from "../../../components/AutoComplete/AutoCompleteComponent.jsx"
import { format, addYears, parse, isAfter } from "date-fns"
import { ToastContainer, toast } from "react-toastify"

import "react-toastify/dist/ReactToastify.css"
import UpdateProductForm from "../../../reuse/UpdateProduct/UpdateProductForm.jsx"

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
            console.log("data: ", data)
            console.log(response.data.filtered_data)
            setKitData(response.data.filtered_data)
            console.log(response.data.filtered_data)
            const parsedDate = parse(data.podate, "yyyy-MM-dd", new Date())
            const formattedPoDate = format(parsedDate, "dd-MM-yyyy")
            console.log(formattedPoDate)

            const parsedValidityDate = data.po_validity
              ? parse(data.po_validity, "yyyy-MM-dd", new Date())
              : null
            const formattedValidityDate = parsedValidityDate
              ? format(parsedValidityDate, "dd-MM-yyyy")
              : null
            console.log(formattedValidityDate)

            const parsedDeliveryDate = data.delivery_date
              ? parse(data.delivery_date, "yyyy-MM-dd", new Date())
              : null

            const formattedDeliveryDate = parsedDeliveryDate
              ? format(parsedDeliveryDate, "dd-MM-yyyy")
              : null
            console.log(
              formattedPoDate,
              formattedValidityDate,
              formattedDeliveryDate
            )
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
              hsn_sac: data.hsn_sac,
              // omat: data.omat,
              uom: data.uom,
            })
            console.log("data: ", data)
            console.log("searchData: ", searchData)
            toast.info(
              `Successfully fetched data for PO Sl No. ${data.po_sl_no}`
            )
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
            }))
            console.log(error.response.data.error)
            toast.error("Error fetching the data")
          })
      : api
          .get("/getData", {
            params: {
              pono: searchData.pono,
            },
          })
          .then((response) => {
            const data = response.data.data
            console.log("response: ", data)
            setKitData(response.data.filtered_data)
            setPoslnos(response.data.po_sl_nos)
            console.log(response.data.po_sl_nos)
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
            })
            toast.success("Successfuly fetched Data!!")
          })
          .catch((error) => {
            console.log(error.response.data.error)
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
    })
  }

  const handleUpdate = (e) => {
    e.preventDefault()
    console.log("kit data: ", kitData)
    api
      .put("/updateForm", { searchInputs, searchData, kitData })
      .then((response) => {
        console.log(response.data)
        // resetDataForm()
        // setKitData()
        toast.success(
          `Form Updated Successfully for PO Sl No: ${searchData.po_sl_no}`
        )
      })
      .catch((error) => {
        console.error("Error updating data: ", error)
        toast.error("ERROR: Invalid/Missing Input Data")
      })
  }

  const handleChangeData = (e) => {
    const { name, value } = e.target
    console.log(name, value)
    setSearchData({
      ...searchData,
      [name]: ["quantity", "unit_price", "qty_sent", "qty_balance"].includes(
        name
      )
        ? parseFloat(value)
        : value,
    })
  }

  const onDateChange = (date, dateString) => {
    console.log("dateString: ", dateString)
    setSearchData((prevFormData) => ({
      ...prevFormData,
      podate: dateString,
    }))
  }

  const onDeliveryDateChange = (date, dateString) => {
    const poDateString = searchData.podate

    // Parse the dates from "dd-MM-yyyy" format
    const poDate = parse(poDateString, "dd-MM-yyyy", new Date())
    const deliveryDate = parse(dateString, "dd-MM-yyyy", new Date())

    console.log("PO Date:", format(poDate, "dd-MM-yyyy"))
    console.log("Delivery Date:", format(deliveryDate, "dd-MM-yyyy"))

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
    setSearchData((prevFormData) => ({
      ...prevFormData,
      po_validity: dateString,
    }))
  }

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

  function parsePackSize(packSize) {
    // Use a regular expression to match the quantity and UOM
    // const regex = /^(\d+)\s*(\w+)$/
    const regex = /^(\d+|\d*\.\d+)\s*(Ltr|Kg|No\.)$/i
    const match = packSize.match(regex)

    if (match) {
      return {
        quantity: parseFloat(match[1]),
        uom: match[2],
      }
    } else {
      //toast.error("Invalid Pack Size Format")
      throw new Error("Invalid pack size format")
      return
    }
  }

  useEffect(() => {
    //  if (!isInitialLoad && searchData.prod_code) {
    if (searchData.prod_code) {
      api
        .get("/packSize", {
          params: {
            prodId: searchData.prod_code,
          },
        })
        .then((response) => {
          console.log("Response Data:", response.data)
          try {
            const { uom } = parsePackSize(response.data.pack_size)
            console.log("PkSz:", response.data.pack_size)
            console.log("UoM:", uom)
            setSearchData((prevData) => ({
              ...prevData,
              pack_size: response.data.pack_size,
              // prod_desc: response.data.prod_desc,
              uom: uom,
            }))
          } catch (error) {
            console.error("Inside:", error.message)
          }
        })
        .catch((error) => {
          console.log("Outside:", error.response.data.error)
        })
    }
  }, [searchData.prod_code])

  return (
    <div className="customer-container">
      <div className="complete-form-container">
        <div className="form-header-container">
          <h1>Update Customer Purchase Order</h1>
          <Link to="/purchase_order">New Entry</Link>
        </div>
        <div className="form-container">
          {/* fetching the data from the database to edit */}
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="only-input-styles">
              <div className="autocomplete-wrapper">
                <AutoCompleteComponent
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
                  // onChange={handleChange}
                  placeholder=" "
                  readOnly
                />
                <label
                  alt="Enter the customer Id"
                  placeholder="Customer ID"
                ></label>
              </div>
              <div className="autocomplete-wrapper">
                <AutoCompleteComponent
                  data={poslnos}
                  mainData={searchData}
                  setData={setPoslnos}
                  setMainData={setSearchData}
                  filteredData={filteredPoSlNo}
                  setFilteredData={setFilteredPoSlNo}
                  name="po_sl_no"
                  placeholder="PO Sl No."
                  search_value="po_sl_no"
                  // onchange={handleChange}
                />
              </div>

              <div className="form-button-container">
                <button type="submit">Get Data</button>
              </div>
            </div>
          </form>
        </div>
        <div className="form-container">
          <form onSubmit={handleUpdate}>
            {/* {searchData.pono && ( */}
            <>
              <div className="only-input-styles">
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
                  <AutoCompleteComponent
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
                <div className="autocomplete-wrapper">
                  <AutoCompleteComponent
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
                  <select
                    name="uom"
                    value={searchData.uom}
                    //                    onChange={handleChangeData}
                    readOnly
                    // required
                  >
                    //{" "}
                    <option value="" disabled>
                      // Select an option //{" "}
                    </option>
                    // <option value="Ltr">Ltr</option>
                    // <option value="Kg">Kg</option>
                    // <option value="No.">No.</option>
                  </select>
                  <label alt="Select an Option" placeholder="UOM"></label>
                </div>
                <div>
                  <input
                    type="number"
                    /*required={true}*/
                    name="quantity"
                    value={searchData.quantity}
                    onChange={handleChangeData}
                    placeholder=" "
                    //                    readOnly
                  />
                  <label
                    alt="Enter the Quantity"
                    placeholder="Quantity"
                  ></label>
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
                    placeholder="Unit Price"
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
              {kitData &&
                kitData.length > 0 &&
                kitData.map((item, index) => {
                  return (
                    <UpdateProductForm
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
              <div className="form-button-container">
                <button type="submit">Update</button>
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
