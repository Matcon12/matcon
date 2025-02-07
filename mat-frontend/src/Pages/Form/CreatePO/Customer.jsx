import { useEffect, useState } from "react"
import "./Customer.css"
import possibleValues from "../../../../data.js"
import { DatePicker, Space } from "antd"
import dayjs from "dayjs"
import ProductDetails from "../../../reuse/ProductDetails/ProductDetails.jsx"
import { Link } from "react-router-dom"
import api from "../../../api/api.jsx"
import AutoCompleteComponent from "../../../components/AutoComplete/AutoCompleteComponent.jsx"
import { format, addYears, parse } from "date-fns"
import { ToastContainer, toast } from "react-toastify"

import "react-toastify/dist/ReactToastify.css"
import ConsigeeDetails from "../../../components/Invoice/ConsigneeDetails/ConsigneeDetails.jsx"

export default function Customer() {
  const [isKit, setIsKit] = useState([1])
  const [customerData, setCustomerData] = useState(0)
  const [consigneeData, setConsigneeData] = useState()
  const [purchaseOrder, setPurchaseOrder] = useState()
  const [suggestions, setSuggestions] = useState([])
  const [filteredCustomerData, setFilteredCustomerData] = useState()
  const [filteredConsigneeData, setFilteredConsigneeData] = useState()
  const [filteredPurchaseData, setFilteredPurchaseData] = useState()
  const [filteredSuggestions, setFilteredSuggestions] = useState()

  useEffect(() => {
    api.get("/getCustomerData").then((response) => {
      setCustomerData(response.data.customerData)
      setConsigneeData(response.data.customerData)
    })
    api.get("/getPurchaseOrder").then((response) => {
      setPurchaseOrder(response.data.distinct_pono)
      console.log("PO: ", response.data.distinct_pono)
    })
    api.get("/getProductCodes").then((response) => {
      setSuggestions(response.data.prod_code)
      console.log("product codes: ", response.data.prod_code)
    })
  }, [])

  // console.log("customer id: ", customerData)
  // console.log("consignee id: ", consigneeData)

  const initialFormData = {
    customerId: "",
    customerName: "",
    poNo: "",
    poDate: null,
    poValidity: null,
    quoteId: "",
    consigneeId: "",
    consigneeName: "",
  }

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

  const [formData, setFormData] = useState(initialFormData)
  const [productDetails, setProductDetails] = useState([initialProductDetails])

  // -------------------------------Changes by TJ --------------------------
  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: name === "poNo" ? value.trim() : value, //Trimming all spaces
    }));
  };

  // Using regular expression to split quantity and UOM from Pack Size

  function parsePackSize(pk_Sz) {    
    //const regex = /^(\d+|\d*\.\d+)\s*(\w+)$/
    const regex = /^(\d+|\d*\.\d+)\s*(Ltr|Kg|No\.)$/i;
  
    const match = pk_Sz.match(regex)
  
    console.log("Match:",match)
    if (match) {
      console.log("PkSz:",match[1],"UoM:",match[2])
      return {
        qty: parseFloat(match[1]),
        u_o_m: match[2],
      }
    } else {
      toast.error("Invalid Pack Size Format")
      throw new Error("Invalid pack size format")
      return
    }
  }

  const handleProductChange = (key, event) => {
    const { name, value } = event.target
    let qtyUom = null; // Initialize qtyUom outside the block

    if (name === "unitPrice") {
      if (value < 0) {
        toast.error("Unit Price cannot be negative");
        return;
      }

      const pksz = productDetails[key]?.packSize;
      if (!pksz) {
        toast.error("Please enter a valid Pack Size");
        return;
      }

      const qnty = productDetails[key]?.quantity;
      console.log("Original Pack Size:", pksz, "Quantity:", qnty);

      try {
        qtyUom = parsePackSize(pksz);
        console.log("Pack:", qtyUom.qty, "UoM:", qtyUom.u_o_m);

        // Ensure that value is a valid, positive integer
        const parsedQuantity = parseFloat(qnty);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
          toast.error("Quantity must be a positive number");
          return;
        }
        // Validate quantity against pack size
        if (parsedQuantity < qtyUom.qty || parsedQuantity % qtyUom.qty !== 0) {
          toast.error(`Quantity must be a multiple of Pack Size (${qtyUom.qty} ${qtyUom.u_o_m})`);
          return;
        }
      } catch (error) {
        console.error("Error parsing pack size:", error.message);
        return; // Exit if pack size parsing fails
      }
    }

    console.log(key, name)
    setProductDetails(
      productDetails.map((productDetail, index) => {
        if (index === key) {
          return {
            ...productDetail,
            uom: qtyUom?.u_o_m || productDetail.uom, // Use existing uom if qtyUom is null
            [name]: ["totalPrice", "quantity", "unitPrice"].includes(name)
              ? parseFloat(value)
              : value,
          };
        }
        return productDetail;
      })
    );
  };
  // ------------------------------- End of Changes ------------------------

  const handleSubmit = (event) => {
    event.preventDefault()
    // console.log(productDetails)
    api
      .post("/submitForm", {
        formData: formData,
        productDetails: productDetails,
      })
      .then((response) => {
        console.log(response.data)
        toast.success(`PO No: ${formData.poNo} created successfully`)
        resetForm()
      })
      .catch((error) => {
        toast.error("ERROR: Invalid/Missing Input Data")
        console.log(error.response.data.error)
        return
      })
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setProductDetails([initialProductDetails])
    setIsKit([1])
  }

  const onDateChange = (date, dateString) => {
    const parsedDate = parse(dateString, "dd-MM-yyyy", new Date())
    const validityDate = addYears(parsedDate, 1)
    const formattedValidityDate = format(validityDate, "dd-MM-yyyy")

    setFormData((prevFormData) => ({
      ...prevFormData,
      poDate: dateString,
      poValidity: formattedValidityDate,
    }))
  }

  const onValidityChange = (date, dateString) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      poValidity: dateString,
    }))
  }

  const onProductDateChange = (date, index, dateStr) => {
    const parsedPoDate = parse(formData.poDate, "dd-MM-yyyy", new Date())
    const formattedPoDate = format(parsedPoDate, "dd-MM-yyyy")
    const parsedDeliveryDate = parse(dateStr, "dd-MM-yyyy", new Date())
    const formattedDeliveryDate = format(parsedDeliveryDate, "dd-MM-yyyy")

    setProductDetails(
      productDetails.map((productDetail, idx) => {
        if (idx === index) {
          return {
            ...productDetail,
            deliveryDate: parsedPoDate <= parsedDeliveryDate ? dateStr : "",
          }
        }
        return productDetail
      })
    )
  }

  const setTotal = (total, index) => {
    setProductDetails(
      productDetails.map((productDetail) => {
        if (productDetails.indexOf(productDetail) == index) {
          return { ...productDetail, ["totalPrice"]: parseFloat(total) }
        }
        return productDetail
      })
    )
  }

  const grandTotal = () => {
    let total = 0.0
    productDetails.forEach((productDetail) => {
      total += parseFloat(productDetail.totalPrice)
    })
    return parseFloat(total).toFixed(2)
  }

  const handleProductDelete = (index) => {
    setProductDetails(
      productDetails.filter((productDetail, idx) => idx !== index)
    )
    setIsKit((prevArray) => {
      const newArray = [...prevArray]
      newArray.splice(index, 1)
      return newArray
    })
  }

  const handleProductClear = (index) => {
    const updatedProductDetails = [...productDetails]

    updatedProductDetails[index] = { ...initialProductDetails }

    setProductDetails(updatedProductDetails)
  }

  const [kit, setKit] = useState()

  useEffect(() => {
    console.log("useEffect CustID:",formData.customerId)
    api
      .get("/customerName", {
        params: {
          customerId: formData.customerId,
        },
      })
      .then((response) => {
        console.log("Customer Name: ", response.data)
        setFormData((prevFormData) => ({
          ...prevFormData,
          consigneeId: formData.customerId,
          customerName: response.data.customer_name,
          consigneeName: response.data.customer_name,
        }))
      })

      .catch((error) => {
        toast.error("UNKNOWN ERROR")  
        console.log(error.data.error)
      })
  }, [formData.customerId])

  const options = []
  for (let i = 10; i < 36; i++) {
    options.push({
      value: i.toString(36) + i,
      label: i.toString(36) + i,
    })
  }

  const addMore = () => {
    setProductDetails((prevProductDetails) => [
      ...prevProductDetails,
      initialProductDetails,
    ])
    console.log("isKit: ", isKit)
    setIsKit((prevData) => [...prevData, 1])
  }

  // useEffect(() => {
  //   formData.consigneeId != formData.customerId
  //     ? api
  //         .get("/customerName", {
  //           params: {
  //             customerId: formData.consigneeId,
  //           },
  //         })
  //         .then((response) => {
  //           console.log("response_data: ", response.data)
  //           setFormData((prevFormData) => ({
  //             ...prevFormData,
  //             consigneeId: formData.consigneeId,
  //             consigneeName: response.data.customer_name,
  //           }))
  //         })

  //         .catch((error) => {
  //           // resetForm()
  //           console.log(error.data.error)
  //         })
  //     : ""
  //   if (formData.consigneeId == "") {
  //     setFormData((prevFormData) => ({
  //       ...prevFormData,
  //       consigneeName: "",
  //     }))
  //   }
  // }, [formData.consigneeId])

  useEffect(() => {
    if (formData.consigneeId && formData.consigneeId !== formData.customerId) {
      api
        .get("/customerName", {
          params: {
            customerId: formData.consigneeId,
          },
        })
        .then((response) => {
          console.log("New Consignee Name: ", response.data)
          setFormData((prevFormData) => ({
            ...prevFormData,
            consigneeName: response.data.customer_name,
          }))
        })
        .catch((error) => {
          console.log(error.data.error)
          toast.error("ERROR: Invalid Consignee ID")
          return
        })
    } else if (formData.consigneeId === "") {
      setFormData((prevFormData) => ({
        ...prevFormData,
        consigneeName: "",
      }))
    }
  }, [formData.consigneeId])

  return (
    <div className="customer-container">
      <div className="complete-form-container">
        <div className="form-header-container">
          <h1>Customer Purchase Order</h1>
          <Link to="/edit_customerPurchaseOrder">Edit</Link>
        </div>
        <div className="form-container">
          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="form-input-and-button-container">
              <div className="only-input-styles">
                <div className="autocomplete-wrapper">
                  <AutoCompleteComponent
                    data={customerData}
                    mainData={formData}
                    setData={setCustomerData}
                    setMainData={setFormData}
                    // handleChange={handleChange}
                    filteredData={filteredCustomerData}
                    setFilteredData={setFilteredCustomerData}
                    name="customerId"
                    placeholder="Customer ID"
                    search_value="cust_id"
                    required={true}
                  />
                </div>
                {/*
                <div className="autocomplete-wrapper">
                  <AutoCompleteComponent
                    data={purchaseOrder}
                    mainData={formData}
                    setData={setPurchaseOrder}
                    setMainData={setFormData}
                    handleChange={handleChange}
                    filteredData={filteredPurchaseData}
                    setFilteredData={setFilteredPurchaseData}
                    name="poNo"
                    placeholder="Customer PO No."
                    search_value="pono"
                    required={true}
                  />
                </div>
                */}
                <div>
                  <input
                    type="text"
                    name="poNo"
                    value={formData.poNo}
                    onChange={handleChange}
                    placeholder="Customer PO No."
                    required={true}
                  />
                  <label
                    alt="Customer PO No."
                    placeholder="Customer PO No."
                  ></label>
                </div>
                <div>
                  <div className="datePickerContainer">
                    <Space direction="vertical">
                      <DatePicker
                        onChange={onDateChange}
                        value={
                          formData.poDate
                            ? dayjs(formData.poDate, "DD-MM-YYYY")
                            : ""
                        }
                        format="DD-MM-YYYY"
                        placeholder={"PO Date"}
                        required={true}
                      />
                      {formData.poDate && (
                        <label className="poLabel">PO Date</label>
                      )}
                    </Space>
                  </div>
                </div>
                <div>
                  <div>
                    <Space direction="vertical">
                      <div className="datePickerContainer">
                        <DatePicker
                          onChange={onValidityChange}
                          value={
                            formData.poValidity
                              ? dayjs(formData.poValidity, "DD-MM-YYYY")
                              : ""
                          }
                          format="DD-MM-YYYY"
                          placeholder={"PO Validity"}
                        />
                        {formData.poValidity && (
                          <label className="poLabel">PO Validity</label>
                        )}
                      </div>
                    </Space>
                  </div>
                </div>
                <div>
                  <input
                    type="text"
                    // required={true}
                    name="quoteId"
                    value={formData.quoteId}
                    onChange={handleChange}
                    placeholder=" "
                  />
                  <label
                    alt="Enter the Quote ID"
                    placeholder="Quote ID"
                  ></label>
                </div>
                <div className="autocomplete-wrapper">
                  <AutoCompleteComponent
                    data={consigneeData}
                    mainData={formData}
                    setData={setConsigneeData}
                    setMainData={setFormData}
                    // handleChange={handleChange}
                    filteredData={filteredConsigneeData}
                    setFilteredData={setFilteredConsigneeData}
                    name="consigneeId"
                    placeholder="Consignee ID"
                    search_value="cust_id"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    placeholder=" "
                    readOnly
                  />
                  <label
                    alt="Enter the Customer Name"
                    placeholder="Customer Name"
                  ></label>
                </div>
                <div>
                  <input
                    type="text"
                    name="consigneeName"
                    value={formData.consigneeName}
                    onChange={handleChange}
                    placeholder=" "
                    readOnly
                  />
                  <label
                    alt="Enter the Consignee Name"
                    placeholder="Consignee Name"
                  ></label>
                </div>
              </div>
              {/* {console.log("product details: ", productDetails)} */}
              {productDetails &&
                productDetails.map((productDetail, index) => {
                  return (
                    <>
                      <ProductDetails
                        key={index}
                        index={index}
                        isKit={isKit}
                        setIsKit={setIsKit}
                        formData={productDetails}
                        setFormData={setProductDetails}
                        handleChange={handleProductChange}
                        suggestions={suggestions}
                        setSuggestions={setSuggestions}
                        filteredSuggestions={filteredSuggestions}
                        setFilteredSuggestions={setFilteredSuggestions}
                        onProductDateChange={onProductDateChange}
                        setTotal={setTotal}
                        handleProductDelete={handleProductDelete}
                        handleProductClear={handleProductClear}
                        kit={kit}
                        setKit={setKit}
                      />
                    </>
                  )
                })}
            </div>
            <div>Grand Total: {grandTotal()}</div>
            <div className="form-button-container">
              <button type="button" value="nextEntry" onClick={addMore}>
                Add More
              </button>
              <button type="submit">Submit</button>
              <button type="button" value="reset" onClick={resetForm}>
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
      <div>
        <ToastContainer />
      </div>
    </div>
  )
}
