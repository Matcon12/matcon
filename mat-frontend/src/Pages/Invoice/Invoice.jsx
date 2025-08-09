import { useState, useEffect, useCallback } from "react"
import "./Invoice.css"
import "../Form/CreatePO/Customer.css"
import { useNavigate } from "react-router-dom"
import api from "../../api/api.jsx"
import AutoCompleteUtil from "../../reuse/ui/AutoCompleteUtil.jsx"
import { ToastContainer, toast } from "react-toastify"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faTrash,
  faArrowsRotate,
  faPlus,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons"

import "react-toastify/dist/ReactToastify.css"

export default function Invoice() {
  const initialFormData = {
    poNo: "",
    customerId: "",
    consigneeId: "",
    newConsigneeId: "",
    customerData: [],
    totalEntries: "",
    contactName: "",
    location: "",
    freight: false,
    insurance: false,
    freightCharges: "",
    insuranceCharges: "",
    otherCharges: {
      key: "",
      value: "",
    },
  }
  const [formData, setFormData] = useState(initialFormData)

  const [entries, setEntries] = useState([])
  const [show, setShow] = useState(false)
  const [purchaseOrder, setPurchaseOrder] = useState([])
  const [contactOptions, setContactOptions] = useState([])
  const [customerData, setCustomerData] = useState([])
  const [purchaseOrderDetails, setPurchaseOrderDetails] = useState([])
  const [poSlNo, setPoSlNo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    console.log("handleInputChange called:", { name, value })
    setFormData((prevFormData) => {
      const newFormData = {
        ...prevFormData,
        [name]: value,
      }
      console.log("Updated formData:", newFormData)
      return newFormData
    })
  }

  const handleOtherChargesChange = (e) => {
    const { name, value } = e.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      otherCharges: {
        ...prevFormData.otherCharges,
        [name]: value,
      },
    }))
  }

  useEffect(() => {
    api
      .get("/getContactNames", {
        params: { consigneeId: formData.newConsigneeId },
      })
      .then((response) => {
        setContactOptions(response.data.contactNames)
      })
  }, [formData.newConsigneeId])

  useEffect(() => {
    //get list of all the purchase order numbers for the autocomplete dropdown
    api.get("/getPurchaseOrder").then((response) => {
      console.log("Purchase order response:", response.data)
      setPurchaseOrder(response.data.distinct_pono)
    })

    //get list of all the customer names for the autocomplete dropdown for new consignee name
    api.get("/getCustomerData").then((response) => {
      setCustomerData(response.data.customerData)
    })
  }, [])

  useEffect(() => {
    console.log("Entries state updated:", entries)
  }, [entries])

  useEffect(() => {
    console.log("PurchaseOrderDetails updated:", purchaseOrderDetails)
  }, [purchaseOrderDetails])

  useEffect(() => {
    // Log entries that have kit products
    const kitEntries = entries.filter(
      (entry) => entry.isKit && entry.kitData && entry.kitData.length > 0
    )
    if (kitEntries.length > 0) {
      console.log("Kit entries found:", kitEntries)
    }
  }, [entries])

  useEffect(() => {
    // Set initial has-value class for kit component inputs
    setTimeout(() => {
      const kitInputs = document.querySelectorAll(
        ".kit-component-hsn input, .kit-component-quantity input"
      )
      kitInputs.forEach((input) => {
        if (input.value && input.value.trim() !== "") {
          input.classList.add("has-value")
        } else {
          input.classList.remove("has-value")
        }
      })
    }, 100) // Small delay to ensure DOM is updated
  }, [entries])

  useEffect(() => {
    api
      .get("/getInvoiceData", {
        params: { poNo: formData.poNo },
      })
      .then((response) => {
        console.log("Invoice data response:", response.data)
        console.log("Location from API:", response.data.result[0]?.location)
        console.log(
          "Setting location to:",
          response.data.result[0]?.location || "HBL"
        )
        setFormData((prevFormData) => ({
          ...prevFormData,
          customerId: response.data.invoice_header_data.customerId,
          consigneeId: response.data.invoice_header_data.consigneeId,
          contactName: response.data.invoice_header_data.contact_names[0],
          location: response.data.result[0]?.location || "HBL",
        }))
        setContactOptions(response.data.invoice_header_data.contact_names)
        console.log("Setting purchaseOrderDetails:", response.data.result)
        setPurchaseOrderDetails(response.data.result)
      })
      .catch((error) => {
        // resetForm()
        console.error(error)
      })
  }, [formData.poNo])

  const handleSubmit = (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validate kit component quantities
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        if (entry.isKit && entry.kitData && entry.kitData.length > 0) {
          for (let j = 0; j < entry.kitData.length; j++) {
            const kitItem = entry.kitData[j]
            if (!kitItem.quantity || kitItem.quantity <= 0) {
              toast.error(
                `Please enter quantity for kit component: ${kitItem.prod_desc}`
              )
              return
            }
          }
        }
      }

      const transformedEntries = entries.map((entry) => {
        // For kit products, we don't validate the main product quantity
        // since quantities are entered for individual kit components
        if (entry.isKit) {
          // Validate kit quantity
          const kitQuantity = Number(entry.kitQuantity || 0)
          if (kitQuantity <= 0) {
            throw new Error(
              `Please enter a valid quantity for kit product ${
                entry.prod_desc || entry.poSlNo
              }.`
            )
          }

          const baseEntry = {
            poSlNo: entry.poSlNo,
            hsnSac: entry.hsnSac,
            quantities: kitQuantity, // Use the kit quantity
            noOfBatches: entry.noOfBatches,
            batch_coc_quant: {
              batch: entry.batches,
              coc: entry.cocs,
              quantity: [kitQuantity.toString()], // Use kit quantity as string in array
            },
          }

          // Add kit component data if this is a kit product
          if (entry.kitData && entry.kitData.length > 0) {
            baseEntry.kitComponents = entry.kitData.map((kitItem) => {
              // For kit components, calculate actual quantity as number_of_packs * pack_size
              const number_of_packs = parseFloat(kitItem.quantity) || 0
              const pack_size_raw = kitItem.pack_size || "1"

              // Extract numeric value from pack_size
              const pack_size_match = pack_size_raw
                .toString()
                .match(/(\d+(?:\.\d+)?)/)
              const pack_size = pack_size_match
                ? parseFloat(pack_size_match[1])
                : 1.0

              // Calculate actual quantity for kit components
              const actual_quantity = number_of_packs * pack_size

              console.log(
                `Kit component ${kitItem.po_sl_no}: number_of_packs=${number_of_packs}, pack_size=${pack_size}, actual_quantity=${actual_quantity}`
              )

              return {
                po_sl_no: kitItem.po_sl_no,
                prod_desc: kitItem.prod_desc,
                hsnSac: kitItem.hsnSac || "",
                unit_price: kitItem.unit_price,
                quantity: actual_quantity, // Send actual quantity (number_of_packs * pack_size)
              }
            })

            // For kit products, we don't need batch data since components are handled separately
            baseEntry.isKitProduct = true
          }

          return baseEntry
        }

        // For non-kit products, validate quantities as before
        const validQuantities = entry.quantities
          .filter((qty) => qty !== "" && qty !== null && qty !== undefined)
          .map((qty) => Number(qty))
          .filter((qty) => !isNaN(qty) && qty > 0)

        const quantitiesSum = validQuantities.reduce(
          (sum, quantity) => sum + quantity,
          0
        )

        console.log("Entry quantities:", entry.quantities)
        console.log("Valid quantities:", validQuantities)
        console.log("Quantities sum:", quantitiesSum)

        if (quantitiesSum <= 0) {
          throw new Error(
            `Invalid quantity for product ${
              entry.prod_desc || entry.poSlNo
            }. Please enter valid quantities.`
          )
        }

        const baseEntry = {
          poSlNo: entry.poSlNo,
          hsnSac: entry.hsnSac,
          quantities: quantitiesSum,
          noOfBatches: entry.noOfBatches,
          batch_coc_quant: {
            batch: entry.batches,
            coc: entry.cocs,
            quantity: entry.quantities,
          },
        }

        return baseEntry
      })

      const formData2 = {
        customerId: formData.customerId,
        consigneeName: formData.consigneeId,
        newConsigneeName: formData.newConsigneeId,
        contactName: formData.contactName,
        location: formData.location,
        poNo: formData.poNo,
        items: transformedEntries,
        freightCharges: formData.freightCharges,
        insuranceCharges: formData.insuranceCharges,
        otherCharges: formData.otherCharges,
      }

      console.log("Submitting form data:", { formData2 })
      console.log("Entries:", entries)
      console.log("Transformed entries:", transformedEntries)
      console.log("Location value being sent:", formData.location)
      console.log("Complete formData state:", formData)
      console.log("formData2 location field:", formData2.location)
      console.log("Complete payload structure:", {
        formData2: {
          ...formData2,
          location: formData.location,
        },
      })
      const payload = {
        formData2,
      }
      console.log(
        "Final payload being sent to API:",
        JSON.stringify(payload, null, 2)
      )

      // Verify location is included in the payload
      if (!payload.formData2.location) {
        console.error("WARNING: Location field is missing from payload!")
        console.error("formData.location:", formData.location)
        console.error("formData2.location:", formData2.location)
      } else {
        console.log(
          "✅ Location field is present in payload:",
          payload.formData2.location
        )
      }

      api
        .post("/invoiceProcessing", payload, {
          headers: {
            "Content-Type": "application/json",
          },
        })
        .then((response) => {
          console.log(response.data)
          navigate("print_invoice", {
            state: { gcn_no: response.data.gcn_no },
          })
        })
        .catch((error) => {
          console.log("Error response:", error.response)
          console.log("Error data:", error.response?.data)
          console.log("Error status:", error.response?.status)
          if (error.response?.data?.error) {
            toast.error(error.response.data.error)
          } else {
            toast.error("An error occurred while processing the invoice")
          }
        })
        .finally(() => {
          setIsSubmitting(false)
        })
    } catch (error) {
      console.log("Validation error:", error.message)
      toast.error(error.message)
      setIsSubmitting(false)
    }
  }

  const handleChange = (entryIndex, fieldIndex, field, value) => {
    console.log("Invoice handleChange called with:", {
      entryIndex,
      fieldIndex,
      field,
      value,
    })
    const newEntries = [...entries]
    if (field === "noOfBatches") {
      const noOfBatches = Number(value)
      newEntries[entryIndex].noOfBatches = noOfBatches
      newEntries[entryIndex].quantities = Array.from(
        { length: noOfBatches },
        (_, i) => newEntries[entryIndex].quantities[i] || ""
      )
      newEntries[entryIndex].batches = Array.from(
        { length: noOfBatches },
        (_, i) => newEntries[entryIndex].batches[i] || ""
      )
      newEntries[entryIndex].cocs = Array.from(
        { length: noOfBatches },
        (_, i) => newEntries[entryIndex].cocs[i] || ""
      )
    } else if (fieldIndex === undefined || fieldIndex === null) {
      // Handle non-array fields like poSlNo, prod_desc, hsnSac
      newEntries[entryIndex][field] = value

      // If poSlNo is being updated, automatically populate prod_desc and hsnSac
      if (field === "poSlNo" && value) {
        console.log("poSlNo selected:", value)
        console.log("purchaseOrderDetails:", purchaseOrderDetails)
        console.log(
          "Sample purchaseOrderDetails item:",
          purchaseOrderDetails[0]
        )

        // Find the matching item in purchaseOrderDetails
        const matchingItem = purchaseOrderDetails.find(
          (item) => item.po_sl_no === value
        )
        console.log("Matching item found:", matchingItem)

        if (matchingItem) {
          newEntries[entryIndex].prod_desc = matchingItem.prod_desc || ""
          newEntries[entryIndex].hsnSac = matchingItem.hsnSac || ""
          newEntries[entryIndex].prod_code = matchingItem.prod_code || ""
          newEntries[entryIndex].qty_balance = matchingItem.qty_balance || 0
          newEntries[entryIndex].unit_price = matchingItem.unit_price || 0
          newEntries[entryIndex].pack_size = matchingItem.pack_size || ""
          newEntries[entryIndex].uom = matchingItem.uom || "units"

          // Check if this is a kit product
          const isKit =
            matchingItem.prod_code && matchingItem.prod_code.startsWith("KIT")
          console.log("Is kit product:", isKit)

          let kitProducts = [] // Initialize kitProducts variable

          if (isKit) {
            // Get kit components (sub-components)
            kitProducts = purchaseOrderDetails.filter((item) =>
              item.po_sl_no.startsWith(value + ".")
            )
            console.log("Kit products found:", kitProducts)
            console.log(
              "All purchaseOrderDetails for kit search:",
              purchaseOrderDetails.map((item) => ({
                po_sl_no: item.po_sl_no,
                prod_desc: item.prod_desc,
                uom: item.uom,
              }))
            )
            // Ensure each kit component has its UOM stored
            const kitProductsWithUOM = kitProducts.map((kitProduct) => ({
              ...kitProduct,
              uom: kitProduct.uom || "units",
            }))
            newEntries[entryIndex].kitData = kitProductsWithUOM
            newEntries[entryIndex].isKit = true
          } else {
            newEntries[entryIndex].isKit = false
            newEntries[entryIndex].kitData = []
          }

          console.log("Auto-populated fields:", {
            prod_desc: matchingItem.prod_desc,
            hsnSac: matchingItem.hsnSac,
            prod_code: matchingItem.prod_code,
            isKit: isKit,
            kitProductsCount: isKit ? kitProducts.length : 0,
          })
        }
      }

      console.log("Updated entry:", newEntries[entryIndex])
    } else {
      // Handle array fields like quantities, batches, cocs
      newEntries[entryIndex][field][fieldIndex] = value
    }
    setEntries(newEntries)
  }

  // Function to calculate main kit quantity from kit components
  const calculateMainKitQuantity = (kitData) => {
    if (!kitData || kitData.length === 0) return 0

    const total = kitData.reduce((sum, component) => {
      const qty = parseFloat(component.quantity) || 0
      console.log("Kit component quantity:", component.po_sl_no, qty)
      return sum + qty
    }, 0)

    console.log("Total calculated quantity:", total)
    return total
  }

  const handleKitComponentQuantityChange = (entryIndex, kitIndex, value) => {
    console.log("Kit component quantity change:", {
      entryIndex,
      kitIndex,
      value,
    })
    const newEntries = [...entries]

    if (
      newEntries[entryIndex].kitData &&
      newEntries[entryIndex].kitData[kitIndex]
    ) {
      const kitItem = newEntries[entryIndex].kitData[kitIndex]
      const quantity = parseFloat(value) || 0
      const balance = parseFloat(kitItem.qty_balance) || 0
      const packSize = parseFloat(kitItem.pack_size) || 1
      const actualQuantity = quantity * packSize

      if (actualQuantity > balance) {
        toast.warning(
          `Quantity cannot exceed available balance. You entered ${quantity} × ${packSize} = ${actualQuantity} units, but only ${balance} units are available.`
        )
        return
      }

      newEntries[entryIndex].kitData[kitIndex] = {
        ...newEntries[entryIndex].kitData[kitIndex],
        quantity: value,
      }

      // Calculate and update main kit quantity
      if (
        newEntries[entryIndex].kitData &&
        newEntries[entryIndex].kitData.length > 0
      ) {
        const mainKitQuantity = calculateMainKitQuantity(
          newEntries[entryIndex].kitData
        )
        console.log(
          "Calculated main kit quantity:",
          mainKitQuantity,
          "from kit data:",
          newEntries[entryIndex].kitData
        )

        // Update the first element of quantities array (main kit quantity)
        if (!newEntries[entryIndex].quantities) {
          newEntries[entryIndex].quantities = []
        }
        newEntries[entryIndex].quantities[0] = mainKitQuantity.toString()
        console.log(
          "Updated quantities array:",
          newEntries[entryIndex].quantities
        )
      }

      setEntries(newEntries)
    }
  }

  const handleNonKitQuantityChange = (entryIndex, fieldIndex, value) => {
    console.log("Non-kit quantity change:", {
      entryIndex,
      fieldIndex,
      value,
    })
    const newEntries = [...entries]

    if (newEntries[entryIndex]) {
      const entry = newEntries[entryIndex]
      const quantity = parseFloat(value) || 0
      const balance = parseFloat(entry.qty_balance) || 0
      const packSize = parseFloat(entry.pack_size) || 1
      const actualQuantity = quantity * packSize

      if (actualQuantity > balance) {
        toast.warning(
          `Quantity cannot exceed available balance. You entered ${quantity} × ${packSize} = ${actualQuantity} units, but only ${balance} units are available.`
        )
        return
      }

      newEntries[entryIndex].quantities[fieldIndex] = value
      setEntries(newEntries)
    }
  }

  const handleKitComponentFieldChange = (
    entryIndex,
    kitIndex,
    field,
    value
  ) => {
    console.log("Kit component field change:", {
      entryIndex,
      kitIndex,
      field,
      value,
    })
    const newEntries = [...entries]

    if (
      newEntries[entryIndex].kitData &&
      newEntries[entryIndex].kitData[kitIndex]
    ) {
      newEntries[entryIndex].kitData[kitIndex] = {
        ...newEntries[entryIndex].kitData[kitIndex],
        [field]: value,
      }

      // If the field being changed is quantity, recalculate main kit quantity
      if (field === "quantity") {
        console.log(
          "Kit component quantity field changed, recalculating main kit quantity"
        )
        if (
          newEntries[entryIndex].kitData &&
          newEntries[entryIndex].kitData.length > 0
        ) {
          const mainKitQuantity = calculateMainKitQuantity(
            newEntries[entryIndex].kitData
          )
          console.log(
            "Calculated main kit quantity from field change:",
            mainKitQuantity
          )

          // Update the first element of quantities array (main kit quantity)
          if (!newEntries[entryIndex].quantities) {
            newEntries[entryIndex].quantities = []
          }
          newEntries[entryIndex].quantities[0] = mainKitQuantity.toString()
          console.log(
            "Updated quantities array from field change:",
            newEntries[entryIndex].quantities
          )
        }
      }

      setEntries(newEntries)
    }
  }

  const handleKitInputFocus = (e) => {
    e.target.classList.add("has-value")
  }

  const handleKitInputBlur = (e) => {
    if (!e.target.value || e.target.value.trim() === "") {
      e.target.classList.remove("has-value")
    } else {
      e.target.classList.add("has-value")
    }
  }

  const getStockLevelClass = (balance) => {
    const balanceNum = parseFloat(balance) || 0
    if (balanceNum <= 10) return "low-stock"
    if (balanceNum <= 50) return "medium-stock"
    return "high-stock"
  }

  const getUOMWithFallback = (item) => {
    return item?.uom || "units"
  }

  const formatBalance = (balance) => {
    const numBalance = parseFloat(balance) || 0
    return numBalance.toFixed(2)
  }

  const getRemainingBalance = (kitItem) => {
    const balance = parseFloat(kitItem.qty_balance) || 0
    const quantity = parseFloat(kitItem.quantity) || 0
    const packSize = parseFloat(kitItem.pack_size) || 1
    const actualQuantity = quantity * packSize
    const remaining = Math.max(0, balance - actualQuantity)
    return remaining.toFixed(2)
  }

  const getNonKitRemainingBalance = (entry, fieldIndex) => {
    const balance = parseFloat(entry.qty_balance) || 0
    const quantity = parseFloat(entry.quantities[fieldIndex]) || 0
    const packSize = parseFloat(entry.pack_size) || 1
    const actualQuantity = quantity * packSize
    const remaining = Math.max(0, balance - actualQuantity)
    return remaining.toFixed(2)
  }

  const resetForm = () => {
    setFormData(initialFormData)
  }

  const purchaseFields = (e) => {
    e.preventDefault()

    if (formData.poNo) {
      setShow(true)
      setEntries(
        Array.from({ length: Number(formData.totalEntries) }, () => ({
          noOfBatches: 1,
          poSlNo: "",
          hsnSac: "",
          prod_desc: "",
          prod_code: "",
          isKit: false,
          kitData: [],
          quantities: [""],
          batches: [""],
          cocs: [""],
        }))
      )
    } else {
      toast.warning("Enter PO No.")
    }
  }

  const handleCheckboxChange = (event) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      [event.target.name]: event.target.checked,
    }))
    console.log(formData)
  }

  const handleDelete = (index) => {
    setEntries(entries.filter((data, idx) => idx != index))
  }

  return (
    <div className="invoice-generation-container">
      <h1>Invoice Generation</h1>
      <form onSubmit={handleSubmit} autoComplete="off">
        <div className="invoice-input-container">
          <div className="autocomplete-wrapper autocomplete-wrapper-invoice">
            <AutoCompleteUtil
              data={purchaseOrder}
              mainData={formData}
              setData={setPurchaseOrder}
              setMainData={setFormData}
              name="poNo"
              placeholder="Customer PO No."
              search_value="pono"
            />
          </div>
          <div>
            <input
              type="text"
              name="customerId"
              value={formData.customerId}
              onChange={handleInputChange}
              placeholder=" "
            />
            <label
              alt="Enter the Customer ID"
              placeholder="Customer ID"
            ></label>
          </div>
          <div>
            <input
              type="text"
              name="consigneeId"
              value={formData.consigneeId}
              onChange={handleInputChange}
              placeholder=" "
            />
            <label
              alt="Enter the Consignee Name"
              placeholder="Consignee Name"
            ></label>
          </div>
          <div className="autocomplete-wrapper autocomplete-wrapper-invoice">
            <AutoCompleteUtil
              data={customerData}
              mainData={formData}
              setData={setCustomerData}
              setMainData={setFormData}
              name="newConsigneeId"
              placeholder="New Consignee Id (if required)"
              search_value="cust_id"
            />
          </div>
          <div className="input-container-contact">
            <select
              name="contactName"
              value={formData.contactName}
              onChange={handleInputChange}
            >
              <option value="" disabled>
                Select an option
              </option>
              {contactOptions.map((option, index) => (
                <option key={index} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <label alt="Select an Option" placeholder="Contact Name"></label>
          </div>
          <div>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              placeholder=" "
            />
            <label alt="Enter the Location" placeholder="Location"></label>
          </div>

          <div>
            <input
              type="text"
              name="freightCharges"
              value={formData.freightCharges}
              onChange={handleInputChange}
              placeholder=" "
            />
            <label
              alt="Enter the Freight Charges"
              placeholder="Freight Charges"
            ></label>
          </div>
          <div>
            <input
              type="text"
              name="insuranceCharges"
              value={formData.insuranceCharges}
              onChange={handleInputChange}
              placeholder=" "
            />
            <label
              alt="Enter the Insurance Charges"
              placeholder="Insurance Charges"
            ></label>
          </div>
          <div className="column1">
            <p>Other Charges:</p>
          </div>
          <div className="otherChargesContainer">
            <div>
              <input
                type="text"
                name="key"
                value={formData.otherCharges.key}
                onChange={handleOtherChargesChange}
                placeholder=" "
              />
              <label
                alt="Enter the Description"
                placeholder="Description"
              ></label>
            </div>
            <div>
              <input
                type="text"
                name="value"
                value={formData.otherCharges.value}
                onChange={handleOtherChargesChange}
                placeholder=" "
              />
              <label alt="Enter the Charges" placeholder="Charges"></label>
            </div>
          </div>
          <div>
            <input
              type="text"
              name="totalEntries"
              value={formData.totalEntries}
              onChange={handleInputChange}
              placeholder=" "
            />
            <label
              alt="Enter the number of entries"
              placeholder="Total no. of Invoice Entries"
            ></label>
          </div>
          <button
            className="PurchaseEntryButton"
            type="button"
            onClick={purchaseFields}
          >
            Enter Item Details
          </button>
        </div>
        <div>
          {show && (
            <div className="invoice-input-complete-container">
              {Array.isArray(entries) &&
                entries.map((entry, entryIndex) => (
                  <div key={entryIndex} className="entry-container">
                    <div className="entry-header">
                      <div className="entry-title">
                        <h3>Entry {entryIndex + 1}</h3>
                        <p className="entry-subtitle">Product Information</p>
                      </div>
                      <div className="entry-actions">
                        <FontAwesomeIcon
                          className="delete-button"
                          icon={faTrash}
                          onClick={() => handleDelete(entryIndex)}
                          title="Delete Entry"
                        />
                      </div>
                    </div>

                    <div className="entry-content">
                      <div className="product-selection-section">
                        <div className="product-inputs">
                          <div className="autocomplete-wrapper">
                            <AutoCompleteUtil
                              data={purchaseOrderDetails}
                              mainData={entries}
                              setData={setPurchaseOrderDetails}
                              setMainData={setEntries}
                              handleArrayChange={(e) =>
                                handleChange(
                                  entryIndex,
                                  undefined,
                                  "poSlNo",
                                  e.target.value
                                )
                              }
                              name="poSlNo"
                              placeholder="PO Sl No."
                              search_value="po_sl_no"
                              setPoSlNo={setPoSlNo}
                              array={true}
                              index={entryIndex}
                            />
                          </div>
                          <div className="product-info">
                            <div className="info-field">
                              <input
                                type="text"
                                name="prod_desc"
                                value={entry.prod_desc}
                                onChange={(e) =>
                                  handleChange(
                                    entryIndex,
                                    null,
                                    "prod_desc",
                                    e.target.value
                                  )
                                }
                                placeholder=" "
                                readOnly
                              />
                              <label>Product Description</label>
                            </div>
                            <div className="info-field">
                              <input
                                type="text"
                                name="hsnSac"
                                value={entry.hsnSac}
                                onChange={(e) =>
                                  handleChange(
                                    entryIndex,
                                    null,
                                    "hsnSac",
                                    e.target.value
                                  )
                                }
                                placeholder=" "
                                onFocus={handleKitInputFocus}
                                onBlur={handleKitInputBlur}
                              />
                              <label>HSN/SAC (Editable)</label>
                            </div>
                            {/* Quantity field for kit products */}
                            {entry.isKit && (
                              <div className="info-field">
                                <input
                                  type="number"
                                  name="kitQuantity"
                                  value={entry.kitQuantity || ""}
                                  onChange={(e) =>
                                    handleChange(
                                      entryIndex,
                                      null,
                                      "kitQuantity",
                                      e.target.value
                                    )
                                  }
                                  placeholder=" "
                                  min="1"
                                  step="1"
                                  onFocus={handleKitInputFocus}
                                  onBlur={handleKitInputBlur}
                                />
                                <label>Kit Quantity</label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Non-Kit Product Components Section */}
                      {!(
                        entry.prod_code && entry.prod_code.startsWith("KIT")
                      ) && (
                        <div className="kit-components-section">
                          <div className="kit-components-header">
                            <h4>Product Details:</h4>
                            <p className="kit-info">
                              Enter quantities and batch details for each batch
                            </p>
                            <div className="batch-count-input">
                              <input
                                type="number"
                                name="noOfBatches"
                                value={entry.noOfBatches}
                                onChange={(e) =>
                                  handleChange(
                                    entryIndex,
                                    null,
                                    "noOfBatches",
                                    e.target.value
                                  )
                                }
                                placeholder=" "
                                min="1"
                                max="10"
                                onFocus={handleKitInputFocus}
                                onBlur={handleKitInputBlur}
                              />
                              <label>Number of Batches</label>
                            </div>
                          </div>
                          <div className="kit-components-container">
                            {entry.quantities
                              .slice(0, entry.noOfBatches || 1)
                              .map((quantity, fieldIndex) => (
                                <div
                                  key={fieldIndex}
                                  className="kit-component-item"
                                >
                                  <div className="kit-component-header">
                                    <strong>Batch {fieldIndex + 1}:</strong>{" "}
                                    Product Details
                                  </div>
                                  <div className="kit-component-details">
                                    <div className="kit-component-info">
                                      <span>Product: {entry.prod_desc}</span>
                                      <span>HSN/SAC: {entry.hsnSac}</span>
                                      <span>PO Sl No: {entry.poSlNo}</span>
                                      <span>
                                        Pack Size: {entry.pack_size || "N/A"}
                                      </span>
                                      <span
                                        className={`kit-component-balance ${getStockLevelClass(
                                          entry.qty_balance
                                        )}`}
                                      >
                                        Balance:{" "}
                                        {formatBalance(entry.qty_balance)}{" "}
                                        {getUOMWithFallback(entry)}
                                        {quantity &&
                                          parseFloat(quantity) > 0 && (
                                            <span className="remaining-balance">
                                              {" "}
                                              (Remaining:{" "}
                                              {getNonKitRemainingBalance(
                                                entry,
                                                fieldIndex
                                              )}
                                              )
                                            </span>
                                          )}
                                      </span>
                                    </div>
                                    <div className="kit-component-fields">
                                      <div className="kit-component-hsn">
                                        <input
                                          type="text"
                                          name={`quantity-${fieldIndex}`}
                                          value={quantity}
                                          onChange={(e) =>
                                            handleNonKitQuantityChange(
                                              entryIndex,
                                              fieldIndex,
                                              e.target.value
                                            )
                                          }
                                          placeholder=" "
                                          onFocus={handleKitInputFocus}
                                          onBlur={handleKitInputBlur}
                                        />
                                        <label>Quantity</label>
                                      </div>
                                      <div className="kit-component-quantity">
                                        <input
                                          type="text"
                                          name={`batch-${fieldIndex}`}
                                          value={entry.batches[fieldIndex]}
                                          onChange={(e) =>
                                            handleChange(
                                              entryIndex,
                                              fieldIndex,
                                              "batches",
                                              e.target.value
                                            )
                                          }
                                          placeholder=" "
                                          onFocus={handleKitInputFocus}
                                          onBlur={handleKitInputBlur}
                                        />
                                        <label>Batch No.</label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Kit Components Section */}
                      {entry.isKit &&
                        entry.kitData &&
                        entry.kitData.length > 0 && (
                          <div className="kit-components-section">
                            <div className="kit-components-header">
                              <h4>Kit Components:</h4>
                              <p className="kit-info">
                                Enter quantities for each kit component
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  console.log(
                                    "Testing kit detection for entry:",
                                    entryIndex
                                  )
                                  console.log("Entry data:", entry)
                                  console.log(
                                    "PurchaseOrderDetails:",
                                    purchaseOrderDetails
                                  )
                                }}
                                style={{
                                  fontSize: "0.8em",
                                  padding: "2px 8px",
                                  marginTop: "5px",
                                }}
                              >
                                Debug Kit Data
                              </button>
                            </div>
                            <div className="kit-components-container">
                              {entry.kitData.map((kitItem, kitIndex) => (
                                <div
                                  key={kitIndex}
                                  className="kit-component-item"
                                >
                                  <div className="kit-component-header">
                                    <strong>Component {kitIndex + 1}:</strong>{" "}
                                    {kitItem.prod_desc}
                                  </div>
                                  <div className="kit-component-details">
                                    <div className="kit-component-info">
                                      <span>PO Sl No: {kitItem.po_sl_no}</span>
                                      <span>
                                        Unit Price: ₹{kitItem.unit_price}
                                      </span>
                                      <span>
                                        Pack Size: {kitItem.pack_size || "N/A"}
                                      </span>
                                      <span
                                        className={`kit-component-balance ${getStockLevelClass(
                                          kitItem.qty_balance
                                        )}`}
                                      >
                                        Balance:{" "}
                                        {formatBalance(kitItem.qty_balance)}{" "}
                                        {getUOMWithFallback(kitItem)}
                                        {kitItem.quantity &&
                                          parseFloat(kitItem.quantity) > 0 && (
                                            <span className="remaining-balance">
                                              {" "}
                                              (Remaining:{" "}
                                              {getRemainingBalance(kitItem)})
                                            </span>
                                          )}
                                      </span>
                                    </div>
                                    <div className="kit-component-fields">
                                      <div className="kit-component-quantity">
                                        <input
                                          type="number"
                                          name={`kit-quantity-${kitIndex}`}
                                          value={kitItem.quantity || ""}
                                          onChange={(e) =>
                                            handleKitComponentQuantityChange(
                                              entryIndex,
                                              kitIndex,
                                              e.target.value
                                            )
                                          }
                                          placeholder=" "
                                          min="0"
                                          step="0.01"
                                          onFocus={handleKitInputFocus}
                                          onBlur={handleKitInputBlur}
                                        />
                                        <label>Quantity</label>
                                      </div>
                                      <div className="kit-component-hsn">
                                        <input
                                          type="text"
                                          name={`kit-hsn-${kitIndex}`}
                                          value={kitItem.hsnSac || ""}
                                          onChange={(e) =>
                                            handleKitComponentFieldChange(
                                              entryIndex,
                                              kitIndex,
                                              "hsnSac",
                                              e.target.value
                                            )
                                          }
                                          placeholder=" "
                                          onFocus={handleKitInputFocus}
                                          onBlur={handleKitInputBlur}
                                        />
                                        <label>HSN/SAC</label>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                ))}
              <div className="submit-button">
                <button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Processing...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
      <ToastContainer />
    </div>
  )
}
