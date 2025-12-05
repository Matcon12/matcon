import { useEffect, useState } from "react"
import "./Customer.css"
import possibleValues from "../../../../data.js"
import { DatePicker, Space, Spin, Alert } from "antd"
import dayjs from "dayjs"
import ProductDetails from "../../../reuse/ProductDetails/ProductDetails.jsx"
import { Link } from "react-router-dom"
import api from "../../../api/api.jsx"
import AutoCompleteUtil from "../../../reuse/ui/AutoCompleteUtil.jsx"
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

  // UX Improvement: Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true)
        const [customerResponse, poResponse, productResponse] =
          await Promise.all([
            api.get("/getCustomerData"),
            api.get("/getPurchaseOrder"),
            api.get("/getProductCodes"),
          ])

        setCustomerData(customerResponse.data.customerData)
        setConsigneeData(customerResponse.data.customerData)
        setPurchaseOrder(poResponse.data.distinct_pono)
        setSuggestions(productResponse.data.prod_code)

        console.log("PO: ", poResponse.data.distinct_pono)
        console.log("product codes: ", productResponse.data.prod_code)
      } catch (error) {
        toast.error("Failed to load initial data. Please refresh the page.")
        console.error("Error loading initial data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [])

  const initialFormData = {
    customerId: "",
    customerName: "",
    poNo: "",
    poDate: null,
    poValidity: null,
    quoteId: "",
    consigneeId: "",
    consigneeName: "",
    location: "HBL",
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

  // Utility function to validate kit product quantities
  const validateKitQuantities = () => {
    const kitValidationErrors = []

    // Find all main kit products
    const mainKitProducts = productDetails.filter(
      (product) =>
        product.prodId &&
        product.prodId.toLowerCase().includes("kit") &&
        product.poSlNo &&
        !product.poSlNo.includes(".")
    )

    mainKitProducts.forEach((mainKit, mainKitIndex) => {
      const mainKitPoSlNo = mainKit.poSlNo
      const mainKitQuantity = parseFloat(mainKit.quantity) || 0

      // Find all kit components for this main kit
      const kitComponents = productDetails.filter(
        (product) =>
          product.poSlNo &&
          product.poSlNo.startsWith(mainKitPoSlNo + ".") &&
          product.poSlNo !== mainKitPoSlNo
      )

      if (kitComponents.length > 0) {
        // Calculate sum of kit component quantities
        const componentQuantitySum = kitComponents.reduce((sum, component) => {
          return sum + (parseFloat(component.quantity) || 0)
        }, 0)

        // Check if main kit quantity equals sum of component quantities
        if (Math.abs(mainKitQuantity - componentQuantitySum) > 0.001) {
          // Using small epsilon for float comparison
          const mainKitProductIndex = productDetails.indexOf(mainKit)
          kitValidationErrors.push({
            index: mainKitProductIndex,
            message: `Kit product quantity (${mainKitQuantity}) must equal sum of component quantities (${componentQuantitySum.toFixed(
              2
            )})`,
          })
        }
      }
    })

    return kitValidationErrors
  }

  // UX Improvement: Enhanced validation
  const validateForm = () => {
    const errors = {}

    if (!formData.customerId) {
      errors.customerId = "Customer ID is required"
    }
    if (!formData.poNo) {
      errors.poNo = "PO Number is required"
    }
    if (!formData.poDate) {
      errors.poDate = "PO Date is required"
    }
    if (!formData.location) {
      errors.location = "Location is required"
    }

    // Validate product details
    const productErrors = []
    productDetails.forEach((product, index) => {
      const hasAnyData = product.prodId || product.productDesc
      if (!hasAnyData) return // Skip empty products

      const productError = {}
      if (!product.prodId || product.prodId.trim() === "") {
        productError.prodId = "Product Code is required"
      }

      const isKitComponent = product.poSlNo && product.poSlNo.includes(".")

      if (isKitComponent) {
        if (!product.quantity || product.quantity <= 0) {
          productError.quantity =
            "Valid quantity is required for kit components"
        }
        if (
          product.unitPrice !== 0 &&
          product.unitPrice !== "" &&
          product.unitPrice !== null
        ) {
          productError.unitPrice = "Unit price must be 0 for kit components"
        }
      } else {
        if (!product.quantity || product.quantity <= 0) {
          productError.quantity = "Valid quantity is required"
        }
        if (!product.unitPrice || product.unitPrice <= 0) {
          productError.unitPrice = "Valid unit price is required"
        }
      }

      if (Object.keys(productError).length > 0) {
        productErrors[index] = productError
      }
    })

    // Validate kit quantities
    const kitQuantityErrors = validateKitQuantities()
    kitQuantityErrors.forEach(({ index, message }) => {
      if (!productErrors[index]) {
        productErrors[index] = {}
      }
      productErrors[index].kitQuantity = message
    })

    if (productErrors.length > 0) {
      errors.products = productErrors
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // -------------------------------Changes by TJ --------------------------
  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: name === "poNo" ? value.trim() : value, //Trimming all spaces
    }))

    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: null,
      }))
    }
  }

  const handleProductChange = (key, event) => {
    const { name, value } = event.target

    if (name === "unitPrice") {
      if (isNaN(value) || value <= 0) {
        toast.error("Please enter a valid Unit Rate")
        return
      }
    }

    // Format numbers to 2 decimal places on blur
    if (
      event.type === "blur" &&
      ["totalPrice", "quantity", "unitPrice"].includes(name)
    ) {
      const numValue = parseFloat(value)
      if (!isNaN(numValue)) {
        event.target.value = numValue.toFixed(2)
      }
    }

    console.log(key, name, value)
    setProductDetails(
      productDetails.map((productDetail, index) => {
        if (index === key) {
          let processedValue = value

          // Convert numeric fields to numbers, but handle empty values properly
          if (["totalPrice", "quantity", "unitPrice"].includes(name)) {
            const numValue = parseFloat(value)
            if (!isNaN(numValue)) {
              processedValue = numValue // Don't format to 2 decimals on change, only on blur
            } else {
              processedValue = ""
            }
          }

          // Check if this is a kit component (po_sl_no contains a dot like "2.1", "2.2")
          const isKitComponent =
            productDetail.poSlNo && productDetail.poSlNo.includes(".")

          // For kit components, force unit price to 0
          if (isKitComponent && name === "unitPrice") {
            processedValue = 0
            toast.info(
              "Unit price is automatically set to 0 for kit components"
            )
          }

          return {
            ...productDetail,
            [name]: processedValue,
          }
        }
        return productDetail
      })
    )

    // Clear product errors when user starts typing
    if (
      formErrors.products &&
      formErrors.products[key] &&
      formErrors.products[key][name]
    ) {
      setFormErrors((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          [key]: {
            ...prev.products[key],
            [name]: null,
          },
        },
      }))
    }

    // Real-time kit quantity validation when quantity changes
    if (name === "quantity") {
      setTimeout(() => {
        const kitQuantityErrors = validateKitQuantities()
        if (kitQuantityErrors.length > 0) {
          setFormErrors((prev) => {
            const newErrors = { ...prev }
            if (!newErrors.products) newErrors.products = []

            // Clear existing kit quantity errors
            Object.keys(newErrors.products).forEach((index) => {
              if (
                newErrors.products[index] &&
                newErrors.products[index].kitQuantity
              ) {
                delete newErrors.products[index].kitQuantity
                if (Object.keys(newErrors.products[index]).length === 0) {
                  delete newErrors.products[index]
                }
              }
            })

            // Add new kit quantity errors
            kitQuantityErrors.forEach(({ index, message }) => {
              if (!newErrors.products[index]) {
                newErrors.products[index] = {}
              }
              newErrors.products[index].kitQuantity = message
            })

            return newErrors
          })
        } else {
          // Clear kit quantity errors if validation passes
          setFormErrors((prev) => {
            const newErrors = { ...prev }
            if (newErrors.products) {
              Object.keys(newErrors.products).forEach((index) => {
                if (
                  newErrors.products[index] &&
                  newErrors.products[index].kitQuantity
                ) {
                  delete newErrors.products[index].kitQuantity
                  if (Object.keys(newErrors.products[index]).length === 0) {
                    delete newErrors.products[index]
                  }
                }
              })
            }
            return newErrors
          })
        }
      }, 300) // Small delay to ensure state is updated
    }
  }
  // ------------------------------- End of Changes ------------------------

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!validateForm()) {
      toast.error("Please fix the errors before submitting")
      return
    }

    // Filter out empty products before submission
    const validProductDetails = productDetails.filter((product) => {
      const isKitComponent = product.poSlNo && product.poSlNo.includes(".")

      if (product.prodId && isKitComponent) {
        return (
          product.prodId.trim() !== "" &&
          product.quantity &&
          product.quantity > 0
        )
      }

      return (
        product.prodId &&
        product.prodId.trim() !== "" &&
        product.quantity &&
        product.quantity > 0 &&
        product.unitPrice &&
        product.unitPrice > 0
      )
    })

    // Ensure kit components have unitPrice set to 0
    const finalProductDetails = validProductDetails.map((product) => {
      const isKitComponent = product.poSlNo && product.poSlNo.includes(".")
      if (isKitComponent) {
        return {
          ...product,
          unitPrice: 0,
          totalPrice: 0,
        }
      }
      return product
    })

    console.log({
      formData: formData,
      productDetails: finalProductDetails,
    })

    // Submit the form with loading state
    try {
      setIsSubmitting(true)
      const response = await api.post("/submitForm", {
        formData: formData,
        productDetails: finalProductDetails,
      })

      console.log(response.data)
      toast.success(`PO No: ${formData.poNo} created successfully`)
      resetForm()
    } catch (error) {
      toast.error("ERROR: Invalid/Missing Input Data")
      console.log(
        "API Error:",
        error?.response?.data?.error || error?.message || "Unknown error"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData(initialFormData)
    setProductDetails([initialProductDetails])
    setIsKit([1])
    setFormErrors({})
  }

  const onDateChange = (date, dateString) => {
    // Handle empty string or null values when user clears the date
    if (!dateString || dateString.trim() === "") {
      setFormData((prevFormData) => ({
        ...prevFormData,
        poDate: null,
        poValidity: null,
      }))
      return
    }

    const parsedDate = parse(dateString, "dd-MM-yyyy", new Date())
    const validityDate = addYears(parsedDate, 1)
    const formattedValidityDate = format(validityDate, "dd-MM-yyyy")

    setFormData((prevFormData) => ({
      ...prevFormData,
      poDate: dateString,
      poValidity: formattedValidityDate,
    }))

    // Clear date error
    if (formErrors.poDate) {
      setFormErrors((prev) => ({
        ...prev,
        poDate: null,
      }))
    }
  }

  const onValidityChange = (date, dateString) => {
    // Handle empty string or null values when user clears the date
    const value = dateString && dateString.trim() !== "" ? dateString : null

    setFormData((prevFormData) => ({
      ...prevFormData,
      poValidity: value,
    }))
  }

  const onProductDateChange = (date, index, dateStr) => {
    // Handle empty string or null values when user clears the date
    if (!dateStr || dateStr.trim() === "") {
      setProductDetails(
        productDetails.map((productDetail, idx) => {
          if (idx === index) {
            return {
              ...productDetail,
              deliveryDate: null,
            }
          }
          return productDetail
        })
      )
      return
    }

    const parsedPoDate = parse(formData.poDate, "dd-MM-yyyy", new Date())
    const formattedPoDate = format(parsedPoDate, "dd-MM-yyyy")
    const parsedDeliveryDate = parse(dateStr, "dd-MM-yyyy", new Date())
    const formattedDeliveryDate = format(parsedDeliveryDate, "dd-MM-yyyy")

    setProductDetails(
      productDetails.map((productDetail, idx) => {
        if (idx === index) {
          return {
            ...productDetail,
            deliveryDate: parsedPoDate <= parsedDeliveryDate ? dateStr : null,
          }
        }
        return productDetail
      })
    )
  }

  // Utility function to format numbers to 2 decimal places
  const formatToTwoDecimals = (value) => {
    const num = parseFloat(value)
    return isNaN(num) ? "0.00" : num.toFixed(2)
  }

  const setTotal = (total, index) => {
    const parsedTotal = parseFloat(total)
    if (!isNaN(parsedTotal)) {
      setProductDetails(
        productDetails.map((productDetail) => {
          if (productDetails.indexOf(productDetail) == index) {
            return { ...productDetail, ["totalPrice"]: parsedTotal.toFixed(2) }
          }
          return productDetail
        })
      )
    }
  }

  const grandTotal = () => {
    let total = 0.0
    productDetails.forEach((productDetail) => {
      const price = parseFloat(productDetail.totalPrice)
      if (!isNaN(price)) {
        total += price
      }
    })
    return parseFloat(total).toFixed(2)
  }

  const handleProductDelete = (index) => {
    const productToDelete = productDetails[index]

    // Check if this is a main kit product
    const isMainKit =
      productToDelete.prodId &&
      productToDelete.prodId.toLowerCase().includes("kit") &&
      productToDelete.poSlNo &&
      !productToDelete.poSlNo.includes(".")

    if (isMainKit) {
      // Get the main kit's po_sl_no (e.g., "2")
      const mainKitPoSlNo = productToDelete.poSlNo

      // Find all kit components that belong to this main kit
      const indicesToDelete = productDetails
        .map((product, idx) => {
          // Check if this is a component of the main kit being deleted
          const isComponent =
            product.poSlNo &&
            product.poSlNo.startsWith(mainKitPoSlNo + ".") &&
            product.poSlNo !== mainKitPoSlNo
          return isComponent ? idx : null
        })
        .filter((idx) => idx !== null)

      // Add the main kit index to the list of indices to delete
      indicesToDelete.push(index)

      // Sort indices in descending order to avoid index shifting issues
      indicesToDelete.sort((a, b) => b - a)

      // Delete all related products
      let updatedProductDetails = [...productDetails]
      let updatedIsKit = [...isKit]

      indicesToDelete.forEach((idx) => {
        updatedProductDetails.splice(idx, 1)
        updatedIsKit.splice(idx, 1)
      })

      setProductDetails(updatedProductDetails)
      setIsKit(updatedIsKit)

      // Show confirmation message
      const componentCount = indicesToDelete.length - 1 // Subtract 1 for the main kit
      if (componentCount > 0) {
        toast.success(
          `Main kit and ${componentCount} component(s) deleted successfully`
        )
      } else {
        toast.success("Main kit deleted successfully")
      }
    } else {
      // Regular product deletion (non-kit or kit component)
      setProductDetails(
        productDetails.filter((productDetail, idx) => idx !== index)
      )
      setIsKit((prevArray) => {
        const newArray = [...prevArray]
        newArray.splice(index, 1)
        return newArray
      })
    }
  }

  const handleProductClear = (index) => {
    const updatedProductDetails = [...productDetails]

    updatedProductDetails[index] = { ...initialProductDetails }

    setProductDetails(updatedProductDetails)
  }

  const [kit, setKit] = useState()

  useEffect(() => {
    if (!formData.customerId) return
    console.log("useEffect CustID:", formData.customerId)
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
        console.log(
          "API Error:",
          error?.response?.data?.error || error?.message || "Unknown error"
        )
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

  useEffect(() => {
    let consID = formData.consigneeId
    let consNM = formData.consigneeName
    if (consID !== formData.customerId) {
      api
        .get("/customerName", {
          params: {
            customerId: consID,
          },
        })
        .then((response) => {
          consNM = response.data.customer_name
          setFormData((prevFormData) => ({
            ...prevFormData,
            consigneeId: consNM ? consID : formData.customerId,
            consigneeName: consNM ? consNM : formData.customerName,
          }))
        })
        .catch((error) => {
          console.log("Invalid consigneeID. Making cust-ID as Cons-ID")
          setFormData((prevFormData) => ({
            ...prevFormData,
            consigneeId: formData.customerId,
            consigneeName: formData.customerName,
          }))
        })
    } else if (
      formData.consigneeId !== formData.customerId ||
      formData.consigneeName !== formData.customerName
    ) {
      setFormData((prevFormData) => ({
        ...prevFormData,
        consigneeId: formData.customerId,
        consigneeName: formData.customerName,
      }))
    }
  }, [formData.consigneeId])

  // UX Improvement: Loading state
  if (isLoading) {
    return (
      <div className="customer-container">
        <div className="loading-container">
          <Spin size="large" />
          <p>Loading purchase order form...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="customer-container">
      <div className="complete-form-container">
        <div className="form-header-container">
          <h1>Customer Purchase Order</h1>
          <Link to="/edit_customerPurchaseOrder">Edit</Link>
        </div>

        <div className="form-container">
          <form onSubmit={handleSubmit} autoComplete="off">
            {/* UX Improvement: Customer details section */}
            <div className="form-section customer-details-section">
              <h2 className="section-title">Customer Information</h2>
              <div className="form-input-and-button-container">
                <div className="only-input-styles">
                  <div className="autocomplete-wrapper">
                    <AutoCompleteUtil
                      data={customerData}
                      mainData={formData}
                      setData={setCustomerData}
                      setMainData={setFormData}
                      filteredData={filteredCustomerData}
                      setFilteredData={setFilteredCustomerData}
                      name="customerId"
                      placeholder="Customer ID"
                      search_value="cust_id"
                      required={true}
                      className={formErrors.customerId ? "error-input" : ""}
                    />
                    {formErrors.customerId && (
                      <div className="error-message">
                        {formErrors.customerId}
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      name="poNo"
                      value={formData.poNo}
                      onChange={handleChange}
                      placeholder="Customer PO No."
                      required={true}
                      className={formErrors.poNo ? "error-input" : ""}
                    />
                    <label
                      alt="Customer PO No."
                      placeholder="Customer PO No."
                    ></label>
                    {formErrors.poNo && (
                      <div className="error-message">{formErrors.poNo}</div>
                    )}
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
                          className={formErrors.poDate ? "error-input" : ""}
                        />
                        {formData.poDate && (
                          <label className="poLabel">PO Date</label>
                        )}
                        {formErrors.poDate && (
                          <div className="error-message">
                            {formErrors.poDate}
                          </div>
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
                      name="quoteId"
                      value={formData.quoteId}
                      onChange={handleChange}
                      placeholder="Quote ID"
                    />
                    <label
                      alt="Enter the Quote ID"
                      placeholder="Quote ID"
                    ></label>
                  </div>
                  <div className="autocomplete-wrapper">
                    <AutoCompleteUtil
                      data={consigneeData}
                      mainData={formData}
                      setData={setConsigneeData}
                      setMainData={setFormData}
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
                      placeholder="Customer Name"
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
                      placeholder="Consignee Name"
                      readOnly
                    />
                    <label
                      alt="Enter the Consignee Name"
                      placeholder="Consignee Name"
                    ></label>
                  </div>
                  <div>
                    <select
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      required
                      className={formErrors.location ? "error-input" : ""}
                    >
                      <option value="HBL">Hebbal (HBL)</option>
                      <option value="ASP">Aerospace Park (ASP)</option>
                    </select>
                    <label alt="Select Location" placeholder="Location"></label>
                    {formErrors.location && (
                      <div className="error-message">{formErrors.location}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* UX Improvement: Product details section */}
            <div className="form-section product-details-section">
              <h2 className="section-title">Product Information</h2>
              {productDetails &&
                productDetails.map((productDetail, index) => {
                  // Determine if this is a main kit product or kit component
                  const isMainKit =
                    productDetail.prodId &&
                    productDetail.prodId.toLowerCase().includes("kit") &&
                    productDetail.poSlNo &&
                    !productDetail.poSlNo.includes(".")
                  const isKitComponent =
                    productDetail.poSlNo && productDetail.poSlNo.includes(".")

                  // Determine CSS class based on kit relationship
                  let productItemClass = "product-item"
                  if (isMainKit) {
                    productItemClass += " kit-main"
                  } else if (isKitComponent) {
                    productItemClass += " kit-component"
                  }

                  return (
                    <div key={index} className={productItemClass}>
                      <ProductDetails
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
                        errors={
                          formErrors.products && formErrors.products[index]
                        }
                      />
                      {/* Display kit quantity validation error */}
                      {formErrors.products &&
                        formErrors.products[index] &&
                        formErrors.products[index].kitQuantity && (
                          <div className="kit-quantity-error">
                            <div className="error-message kit-validation-error">
                              {formErrors.products[index].kitQuantity}
                            </div>
                          </div>
                        )}
                    </div>
                  )
                })}
            </div>

            <div className="form-button-container">
              <button
                type="button"
                value="nextEntry"
                onClick={addMore}
                className="add-more-btn"
              >
                Add More Products
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <Spin size="small" style={{ marginRight: "8px" }} />
                    Submitting...
                  </>
                ) : (
                  "Submit Order"
                )}
              </button>
              <button
                type="button"
                value="reset"
                onClick={resetForm}
                className="reset-btn"
              >
                Reset Form
              </button>
            </div>

            {/* UX Improvement: Summary section */}
            <div className="form-section summary-section">
              <div className="summary-card">
                <h3>Order Summary</h3>
                <div className="summary-content">
                  <div className="summary-item">
                    <span>Customer:</span>
                    <span>{formData.customerName || "Not selected"}</span>
                  </div>
                  <div className="summary-item">
                    <span>PO Number:</span>
                    <span>{formData.poNo || "Not entered"}</span>
                  </div>
                  <div className="summary-item">
                    <span>Products:</span>
                    <span>
                      {productDetails.filter((p) => p.prodId).length} items
                    </span>
                  </div>
                  <div className="summary-item total">
                    <span>Grand Total:</span>
                    <span>₹{grandTotal()}</span>
                  </div>
                </div>
              </div>
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
