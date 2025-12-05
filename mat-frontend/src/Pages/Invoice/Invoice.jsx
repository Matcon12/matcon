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
      console.log("Entries before submission:", entries)
      const transformedEntries = entries.map((entry) => {
        if (entry.isKit && entry.kitData && entry.kitData.length > 0) {
          // Kit product - only include specific fields
          return {
            poSlNo: entry.poSlNo,
            quantities: entry.kitQuantity,
            hsnSac: entry.hsnSac || "",
            isKitProduct: true,
            kitComponents: entry.kitData.map((kitComp) => ({
              po_sl_no: kitComp.po_sl_no,
              prod_code: kitComp.prod_code,
              prod_desc: kitComp.prod_desc,
              quantity: kitComp.quantity || "",
              uom: kitComp.uom,
              hsnSac: kitComp.hsnSac || "",
              noOfBatches: kitComp.noOfBatches,
              batch: kitComp.batches
                ? kitComp.batches.map((b) => b.batchNo)
                : [],
              coc: kitComp.batches
                ? kitComp.batches.map((b) => b.coc || "")
                : [],
              quantity_list: kitComp.batches
                ? kitComp.batches.map((b) => b.quantity.toString())
                : [],
            })),
          }
        } else {
          // Regular product - exclude quantities field, only include batch_coc_quant
          const totalQuantity = entry.quantities
            ? entry.quantities.reduce((sum, q) => sum + Number(q), 0).toString()
            : "0"
          return {
            poSlNo: entry.poSlNo,
            hsnSac: entry.hsnSac || "",
            quantities: totalQuantity,
            noOfBatches: entry.noOfBatches,
            batch_coc_quant: {
              batch: entry.batches
                ? entry.batches.map((b) =>
                    typeof b === "object" ? b.batchNo : b
                  )
                : [],
              coc: entry.cocs ? entry.cocs.map((c) => c || "") : [],
              quantity: entry.quantities
                ? entry.quantities.map((q) => q.toString())
                : [],
            },
          }
        }
      })

      // Create the payload in the exact structure you specified, including location
      const formData2 = {
        consigneeName: formData.consigneeId,
        contactName: formData.contactName,
        customerId: formData.customerId,
        freightCharges: formData.freightCharges,
        insuranceCharges: formData.insuranceCharges,
        location: formData.location,
        newConsigneeName: formData.newConsigneeId,
        otherCharges: formData.otherCharges,
        poNo: formData.poNo,
        items: transformedEntries,
      }

      console.log("Submitting form data:", { formData2 })
      console.log("Entries:", entries)
      console.log("Transformed entries:", transformedEntries)
      console.log("Complete formData state:", formData)

      const payload = {
        formData2,
      }
      console.log(
        "Final payload being sent to API:",
        JSON.stringify(payload, null, 2)
      )

      console.log("Sending payload to /invoiceProcessing:", payload)
      // setIsSubmitting(false)

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
              noOfBatches: 1,
              batches: initializeKitBatches(1, kitProduct),
              quantity: "",
            }))

            newEntries[entryIndex].kitData = kitProductsWithUOM
            newEntries[entryIndex].isKit = true
            newEntries[entryIndex].kitQuantity = "0" // Initialize to 0
          } else {
            newEntries[entryIndex].isKit = false
            newEntries[entryIndex].kitData = []
            newEntries[entryIndex].kitQuantity = "" // Clear if not a kit
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
      // const packSize = parseFloat(kitItem.pack_size) || 1
      // const actualQuantity = quantity * packSize

      if (quantity > balance) {
        toast.warning(
          `Quantity cannot exceed available balance. You entered ${quantity}, but only ${balance} units are available.`
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

  // const handleNonKitQuantityChange = (entryIndex, fieldIndex, value) => {
  //   console.log("Non-kit quantity change:", {
  //     entryIndex,
  //     fieldIndex,
  //     value,
  //   })
  //   const newEntries = [...entries]

  //   if (newEntries[entryIndex]) {
  //     const entry = newEntries[entryIndex]
  //     const quantity = parseFloat(value) || 0
  //     const balance = parseFloat(entry.qty_balance) || 0
  //     const packSize = parseFloat(entry.pack_size) || 1

  //     // Create a temporary copy to calculate total quantity across all batches
  //     const tempQuantities = [...entry.quantities]
  //     tempQuantities[fieldIndex] = value

  //     // Calculate total quantity across all batches
  //     const totalQuantityAcrossAllBatches = tempQuantities
  //       .filter((qty) => qty !== "" && qty !== null && qty !== undefined)
  //       .map((qty) => parseFloat(qty) || 0)
  //       .reduce((sum, qty) => sum + qty, 0)

  //     // const totalActualQuantity = totalQuantityAcrossAllBatches * packSize

  //     // Validate against total balance
  //     if (totalQuantityAcrossAllBatches > balance) {
  //       const maxAllowedTotal = Math.floor(balance / packSize)
  //       const currentTotalExcludingThis = tempQuantities
  //         .filter(
  //           (qty, idx) =>
  //             idx !== fieldIndex &&
  //             qty !== "" &&
  //             qty !== null &&
  //             qty !== undefined
  //         )
  //         .map((qty) => parseFloat(qty) || 0)
  //         .reduce((sum, qty) => sum + qty, 0)

  //       const maxAllowedForThisField = Math.max(
  //         0,
  //         maxAllowedTotal - currentTotalExcludingThis
  //       )

  //       toast.warning(
  //         `Total quantity across all batches cannot exceed available balance. ` +
  //           `You're trying to use ${totalQuantityAcrossAllBatches}, ` +
  //           `but only ${balance} units are available. ` +
  //           `Maximum allowed for this batch: ${maxAllowedForThisField} (${maxAllowedForThisField})`
  //       )
  //       return
  //     }

  //     newEntries[entryIndex].quantities[fieldIndex] = value
  //     setEntries(newEntries)
  //   }
  // }

  function handleNonKitQuantityChange(entryIndex, fieldIndex, value) {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== entryIndex) return entry
        const newQuantities = [...entry.quantities]
        newQuantities[fieldIndex] = value
        return { ...entry, quantities: newQuantities }
      })
    )
  }

  // function handleNonKitQuantityChange(entryIndex, fieldIndex, value) {
  //   setEntries((prev) =>
  //     prev.map((entry, i) => {
  //       if (i !== entryIndex) return entry
  //       const newQuantities = [...entry.quantities]
  //       newQuantities[fieldIndex] = value
  //       return { ...entry, quantities: newQuantities }
  //     })
  //   )
  // }

  // On blur, validate pack-size multiple, positive, and total balance
  function handleNonKitInputBlur(e, entryIndex, fieldIndex) {
    const value = parseFloat(e.target.value)
    const entry = entries[entryIndex]
    console.log("Big entries:", entry)
    const packSize = parseFloat(entry.pack_size) || 1
    const balance = parseFloat(entry.qty_balance) || 0
    console.log("packSize, balance:", packSize, balance)

    // 1. Positive number
    if (isNaN(value) || value <= 0) {
      toast.error("Quantity must be a positive number")
      setTimeout(() => {
        e.target.focus()
        e.target.select()
      }, 100)
      return
    }

    // 2. Pack-size multiple
    if ((value * 1000) % (packSize * 1000) !== 0) {
      toast.error(`Quantity must be a multiple of pack size ${packSize}`)
      setTimeout(() => {
        e.target.focus()
        e.target.select()
      }, 100)
      return
    }

    // 3. Total across all batches ≤ balance
    const otherTotals = entry.quantities
      .filter((_, idx) => idx !== fieldIndex)
      .reduce((sum, qty) => sum + (parseFloat(qty) || 0), 0)
    const totalAfter = otherTotals + value

    if (totalAfter > balance) {
      const maxForThis = Math.max(
        0,
        Math.floor(balance / packSize) - otherTotals
      )
      toast.error(
        `Total quantity across all batches cannot exceed balance. Maximum for this batch: ${maxForThis}`
      )
      setTimeout(() => {
        e.target.focus()
        e.target.select()
      }, 100)
      return
    }

    // 4. On success, format and mark as filled
    const formatted = value.toFixed(2)
    handleNonKitQuantityChange(entryIndex, fieldIndex, formatted)
    e.target.classList.add("has-value")
  }

  const validateNonKitQuantityMultiple = (entryIndex, fieldIndex, value) => {
    const entry = entries[entryIndex]
    const quantity = parseFloat(value) || 0
    const packSize = parseFloat(entry.pack_size) || 1
    if (packSize === 0) return
    if (Math.abs(quantity % packSize) > 0.0001) {
      toast.warning(
        `Quantity must be a multiple of pack size (${packSize}). Entered: ${quantity}`
      )
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

  const getTotalRemainingBalance = (item) => {
    const balance = parseFloat(item.qty_balance) || 0
    const packSize = parseFloat(item.pack_size) || 1

    // Check if this is a kit component (doesn't have quantities array)
    if (!item.quantities) {
      // For kit components, calculate remaining balance based on individual quantity
      const quantity = parseFloat(item.quantity) || 0
      // const actualQuantity = quantity * packSize
      const remaining = Math.max(0, balance - quantity)
      return remaining.toFixed(2)
    }

    // For regular entries with quantities array
    const totalQuantityUsed = item.quantities
      .filter((qty) => qty !== "" && qty !== null && qty !== undefined)
      .map((qty) => parseFloat(qty) || 0)
      .reduce((sum, qty) => sum + qty, 0)

    // const totalActualQuantityUsed = totalQuantityUsed * packSize
    const remaining = Math.max(0, balance - totalQuantityUsed)
    return remaining.toFixed(2)
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

  // const handleNonKitInputBlur = (e, entryIndex, fieldIndex) => {
  //   if (!e.target.value || e.target.value.trim() === "") {
  //     e.target.classList.remove("has-value")
  //   } else {
  //     e.target.classList.add("has-value")
  //     const entry = entries[entryIndex]
  //     const quantity = parseFloat(e.target.value) || 0
  //     const packSize = parseFloat(entry?.pack_size) || 1
  //     if (packSize && Math.abs(quantity % packSize) != 0) {
  //       toast.warning(
  //         `Quantity must be a multiple of pack size (${packSize}). Entered: ${quantity}`
  //       )
  //     }
  //   }
  // }

  const handleValidateKitInputBlur = (e, entryIndex, kitIndex) => {
    if (!e.target.value || e.target.value.trim() === "") {
      e.target.classList.remove("has-value")
    } else {
      e.target.classList.add("has-value")
      const kitItem = entries[entryIndex]?.kitData?.[kitIndex]
      console.log("kitIndex, entryIndex:", kitIndex, entryIndex)
      const quantity = parseFloat(e.target.value) || 0
      const packSize = parseFloat(kitItem?.pack_size) || 1
      if (packSize && Math.abs(quantity % packSize) != 0) {
        toast.warning(
          `Kit component quantity must be a multiple of pack size (${packSize}). Entered: ${quantity}`
        )
      }
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
    // const actualQuantity = quantity * packSize
    const remaining = Math.max(0, balance - quantity)
    return remaining.toFixed(2)
  }

  const getNonKitRemainingBalance = (entry, fieldIndex) => {
    const balance = parseFloat(entry.qty_balance) || 0
    const quantity = parseFloat(entry.quantities[fieldIndex]) || 0
    const packSize = parseFloat(entry.pack_size) || 1
    // const actualQuantity = quantity * packSize
    const remaining = Math.max(0, balance - quantity)
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

  const getRemainingBalanceForBatch = (entry, currentBatchIndex) => {
    const totalBalance = parseFloat(entry.qty_balance) || 0
    const packSize = parseFloat(entry.pack_size) || 1

    // Calculate total quantity used across all batches
    const totalQuantityUsed = entry.quantities
      .filter((qty, index) => {
        // Include all quantities except the current batch we're calculating for
        return (
          qty !== "" &&
          qty !== null &&
          qty !== undefined &&
          index !== currentBatchIndex
        )
      })
      .map((qty) => parseFloat(qty) || 0)
      .reduce((sum, qty) => sum + qty, 0)

    // const totalActualQuantityUsed = totalQuantityUsed * packSize
    const remainingBalance = Math.max(0, totalBalance - totalQuantityUsed)

    return remainingBalance.toFixed(2)
  }

  // Alternative: Get remaining balance including current batch quantity
  const getCurrentRemainingBalance = (entry, currentBatchIndex) => {
    const totalBalance = parseFloat(entry.qty_balance) || 0
    const packSize = parseFloat(entry.pack_size) || 1

    // Calculate total quantity used across all batches including current
    const totalQuantityUsed = entry.quantities
      .filter((qty) => qty !== "" && qty !== null && qty !== undefined)
      .map((qty) => parseFloat(qty) || 0)
      .reduce((sum, qty) => sum + qty, 0)

    // const totalActualQuantityUsed = totalQuantityUsed * packSize
    const remainingBalance = Math.max(0, totalBalance - totalQuantityUsed)

    return remainingBalance.toFixed(2)
  }

  // Updated helper functions for individual batch calculations

  // Helper function to initialize batches array for kit components
  const initializeKitBatches = (numBatches, kitItem) => {
    const balance = parseFloat(kitItem.qty_balance) || 0
    return Array.from({ length: numBatches }, () => ({
      batchNo: "",
      quantity: "",
      packSize: kitItem.pack_size || 1,
      balance: balance, // Each batch shows the original balance
      remaining: balance, // Initially, remaining equals balance
    }))
  }

  // Handle kit component batch field changes with individual batch calculations
  // const handleKitBatchChange = (
  //   entryIndex,
  //   kitIndex,
  //   batchIndex,
  //   field,
  //   value
  // ) => {
  //   setEntries((prev) => {
  //     const updated = [...prev]
  //     const kitItem = updated[entryIndex].kitData[kitIndex]

  //     if (!kitItem.batches) {
  //       kitItem.batches = initializeKitBatches(
  //         kitItem.noOfBatches || 1,
  //         kitItem
  //       )
  //     }

  //     // Update the specific field
  //     kitItem.batches[batchIndex] = {
  //       ...kitItem.batches[batchIndex],
  //       [field]: value,
  //     }

  //     // Recalculate remaining quantities for all batches when quantity changes
  //     if (field === "quantity") {
  //       const quantity = parseFloat(value) || 0
  //       const originalBalance = parseFloat(kitItem.qty_balance) || 0

  //       // Calculate total quantity used across all batches of this kit component
  //       const totalUsedAcrossAllBatches = kitItem.batches.reduce(
  //         (sum, batch) => {
  //           return sum + (parseFloat(batch.quantity) || 0)
  //         },
  //         0
  //       )

  //       // Check if total exceeds balance
  //       if (totalUsedAcrossAllBatches > originalBalance) {
  //         toast.warning(
  //           `Total quantity across all batches cannot exceed available balance (${originalBalance})`
  //         )
  //         return prev // Don't update if validation fails
  //       }

  //       // Update remaining for each batch individually
  //       kitItem.batches.forEach((batch, idx) => {
  //         const batchQuantity = parseFloat(batch.quantity) || 0

  //         if (idx === batchIndex) {
  //           // For the current batch being edited
  //           batch.remaining = Math.max(
  //             0,
  //             originalBalance - totalUsedAcrossAllBatches
  //           ).toFixed(2)
  //         } else {
  //           // For other batches, recalculate their remaining based on their individual usage
  //           const otherBatchQuantity = parseFloat(batch.quantity) || 0
  //           const remainingForThisBatch = Math.max(
  //             0,
  //             originalBalance - totalUsedAcrossAllBatches
  //           ).toFixed(2)
  //           batch.remaining = remainingForThisBatch
  //         }
  //       })

  //       // Alternative approach: Show individual batch remaining as balance minus current batch quantity
  //       // Uncomment this section if you want each batch to show remaining as balance - its own quantity
  //       /*
  //     kitItem.batches.forEach((batch, idx) => {
  //       const batchQuantity = parseFloat(batch.quantity) || 0
  //       batch.remaining = Math.max(0, originalBalance - batchQuantity).toFixed(2)
  //     })
  //     */

  //       // Update main kit quantity (sum of all component quantities across all batches)
  //       const mainKitQuantity = updated[entryIndex].kitData.reduce(
  //         (sum, component) => {
  //           if (component.batches) {
  //             return (
  //               sum +
  //               component.batches.reduce((batchSum, batch) => {
  //                 return batchSum + (parseFloat(batch.quantity) || 0)
  //               }, 0)
  //             )
  //           }
  //           return sum + (parseFloat(component.quantity) || 0)
  //         },
  //         0
  //       )

  //       updated[entryIndex].kitQuantity = mainKitQuantity.toString()
  //     }

  //     return updated
  //   })
  // }

  const handleKitBatchChange = (
    entryIndex,
    kitIndex,
    batchIndex,
    field,
    value
  ) => {
    setEntries((prev) => {
      const updated = [...prev]
      const kitItem = updated[entryIndex].kitData[kitIndex]
      if (!kitItem.batches) {
        kitItem.batches = initializeKitBatches(
          kitItem.noOfBatches || 1,
          kitItem
        )
      }
      // Update specific batch field
      kitItem.batches[batchIndex] = {
        ...kitItem.batches[batchIndex],
        [field]: value,
      }
      // Recalculate total quantity used across all batches
      const totalUsed = kitItem.batches.reduce(
        (sum, batch) => sum + (parseFloat(batch.quantity) || 0),
        0
      )
      // Update remaining for each batch accordingly
      kitItem.batches.forEach((batch) => {
        batch.remaining = Math.max(
          0,
          parseFloat(kitItem.qtybalance || 0) - totalUsed
        ).toFixed(2)
      })
      // Also update the mainKitQuantity for this entry from all components
      const mainKitQuantity = updated[entryIndex].kitData.reduce(
        (total, component) => {
          if (component.batches)
            return (
              total +
              component.batches.reduce(
                (batchSum, batch) =>
                  batchSum + (parseFloat(batch.quantity) || 0),
                0
              )
            )
          return total + (parseFloat(component.quantity) || 0)
        },
        0
      )
      updated[entryIndex].kitQuantity = mainKitQuantity.toString()
      return updated
    })
  }

  function handleKitBatchQuantityBlur(e, entryIndex, kitIndex, batchIndex) {
    const value = parseFloat(e.target.value)
    const batch = entries[entryIndex].kitData[kitIndex].batches[batchIndex]
    const packSize = parseFloat(batch.packSize) || 1
    const balance = parseFloat(batch.balance) || 0
    const component = entries[entryIndex].kitData[kitIndex]
    const componentBalance = parseFloat(component.qty_balance) || 0

    console.log(
      "value, batch, packSize, balance, component, componentBalance:",
      {
        value,
        batch,
        packSize,
        balance,
        component,
        componentBalance,
      }
    )

    // 1. Positive number
    if (isNaN(value) || value <= 0) {
      toast.error("Batch quantity must be a positive number")
      setTimeout(() => {
        e.target.focus()
        e.target.select()
      }, 100)
      return
    }

    // 2. Pack‐size multiple
    if ((value * 1000) % (packSize * 1000) !== 0) {
      toast.error(`Quantity must be a multiple of pack size ${packSize}`)
      setTimeout(() => {
        e.target.focus()
        e.target.select()
      }, 100)
      return
    }

    // 3. Individual batch ≤ its balance
    if (value > balance) {
      toast.error(
        `Batch units (${
          value * packSize
        }) exceed this batch balance (${balance})`
      )
      setTimeout(() => {
        e.target.focus()
        e.target.select()
      }, 100)
      return
    }

    // 4. Total across all batches for this component ≤ component balance
    const otherTotal = component.batches
      .filter((_, idx) => idx !== batchIndex)
      .reduce((sum, b) => sum + (parseFloat(b.quantity) || 0), 0)
    if (otherTotal + value > componentBalance) {
      toast.error(
        `Total across all batches (${
          otherTotal + value
        }) exceeds component balance (${componentBalance})`
      )
      setTimeout(() => {
        e.target.focus()
        e.target.select()
      }, 100)
      return
    }

    // 5. On success, format and mark filled
    const formatted = value.toFixed(2)
    handleKitBatchChange(
      entryIndex,
      kitIndex,
      batchIndex,
      "quantity",
      formatted
    )
    e.target.classList.add("has-value")

    // Force recalculation of kit quantity
    setTimeout(() => {
      setEntries((prev) =>
        prev.map((entry, i) => {
          if (i !== entryIndex) return entry

          const calculatedKitQuantity = entry.kitData.reduce(
            (total, component) => {
              if (component.batches) {
                const componentTotal = component.batches.reduce(
                  (batchSum, batch) => {
                    return batchSum + (parseFloat(batch.quantity) || 0)
                  },
                  0
                )
                return total + componentTotal
              }
              return total
            },
            0
          )

          return {
            ...entry,
            kitQuantity: calculatedKitQuantity.toString(),
          }
        })
      )
    }, 0)
  }

  // Alternative calculation method: Individual batch remaining calculation
  const handleKitBatchChangeIndividual = (
    entryIndex,
    kitIndex,
    batchIndex,
    field,
    value
  ) => {
    setEntries((prev) => {
      const updated = [...prev]
      const kitItem = updated[entryIndex].kitData[kitIndex]

      if (!kitItem.batches) {
        kitItem.batches = initializeKitBatches(
          kitItem.noOfBatches || 1,
          kitItem
        )
      }

      // Update the specific field
      kitItem.batches[batchIndex] = {
        ...kitItem.batches[batchIndex],
        [field]: value,
      }

      // Recalculate remaining for this specific batch only
      if (field === "quantity") {
        const quantity = parseFloat(value) || 0
        const originalBalance = parseFloat(kitItem.qty_balance) || 0

        // Validate individual batch quantity
        if (quantity > originalBalance) {
          toast.warning(
            `Batch quantity cannot exceed available balance (${originalBalance})`
          )
          return prev // Don't update if validation fails
        }

        // Update remaining for this specific batch
        kitItem.batches[batchIndex].remaining = Math.max(
          0,
          originalBalance - quantity
        ).toFixed(2)

        // Calculate total quantity used across all batches for validation
        const totalUsedAcrossAllBatches = kitItem.batches.reduce(
          (sum, batch) => {
            return sum + (parseFloat(batch.quantity) || 0)
          },
          0
        )

        // Check if total exceeds balance and show warning
        if (totalUsedAcrossAllBatches > originalBalance) {
          toast.warning(
            `Total quantity across all batches (${totalUsedAcrossAllBatches}) exceeds available balance (${originalBalance})`
          )
        }

        // Update main kit quantity (sum of all component quantities across all batches)
        const mainKitQuantity = updated[entryIndex].kitData.reduce(
          (sum, component) => {
            if (component.batches) {
              return (
                sum +
                component.batches.reduce((batchSum, batch) => {
                  return batchSum + (parseFloat(batch.quantity) || 0)
                }, 0)
              )
            }
            return sum + (parseFloat(component.quantity) || 0)
          },
          0
        )

        updated[entryIndex].kitQuantity = mainKitQuantity.toString()
      }

      return updated
    })
  }

  // Handle kit component number of batches change with proper initialization
  const handleKitComponentBatchCountChange = (entryIndex, kitIndex, value) => {
    const numBatches = parseInt(value) || 1
    setEntries((prev) => {
      const updated = [...prev]
      const kitItem = updated[entryIndex].kitData[kitIndex]

      kitItem.noOfBatches = numBatches

      // Preserve existing batch data when possible
      const existingBatches = kitItem.batches || []
      const newBatches = Array.from({ length: numBatches }, (_, index) => {
        if (index < existingBatches.length) {
          // Keep existing batch data
          return {
            ...existingBatches[index],
            packSize: kitItem.pack_size || 1,
            balance: parseFloat(kitItem.qty_balance) || 0,
            // Recalculate remaining based on current quantity
            remaining: Math.max(
              0,
              (parseFloat(kitItem.qty_balance) || 0) -
                (parseFloat(existingBatches[index].quantity) || 0)
            ).toFixed(2),
          }
        } else {
          // Create new batch
          return {
            batchNo: "",
            quantity: "",
            packSize: kitItem.pack_size || 1,
            balance: parseFloat(kitItem.qty_balance) || 0,
            remaining: (parseFloat(kitItem.qty_balance) || 0).toFixed(2),
          }
        }
      })

      kitItem.batches = newBatches

      return updated
    })
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
              {console.log(entries)}
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
                          <div>
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
                            {entry.isKit && (
                              <div className="kit-total-container product-info">
                                <div className="kit-component-info">
                                  <span>
                                    Unit Price: ₹
                                    {Number(entry.unit_price || 0).toFixed(2)}
                                  </span>
                                  <span>
                                    Total amount: ₹
                                    {(
                                      Number(entry.unit_price || 0) *
                                      Number(entry.kitQuantity || 0)
                                    ).toFixed(2)}
                                  </span>
                                  {/* <span>
                                    Pack Size: {entry.pack_size || "N/A"}
                                  </span> */}
                                  <span
                                    className={`kit-component-balance ${getStockLevelClass(
                                      entry.qty_balance
                                    )}`}
                                  >
                                    Available Balance:{" "}
                                    {formatBalance(entry.qty_balance)}{" "}
                                    {getUOMWithFallback(entry)}
                                  </span>
                                  <span className="total-balance-info">
                                    Overall Remaining:{" "}
                                    {(
                                      Number(entry.qty_balance || 0) -
                                      Number(entry.kitQuantity || 0)
                                    ).toFixed(2)}{" "}
                                    {getUOMWithFallback(entry)}
                                    {/* (
                                    Number(entry.qty_balance || 0) -
                                    Number(entry.kitQuantity || 0)).toFixed(2){" "}
                                    {getUOMWithFallback(entry)} */}
                                  </span>
                                </div>
                              </div>
                            )}
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
                                  readOnly
                                />
                                <label>Kit Quantity</label>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Non Kit Product Components Section */}
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
                                      <span>
                                        Unit Price: ₹
                                        {Number(entry.unit_price).toFixed(2)}
                                      </span>
                                      <span>
                                        Total amount: ₹
                                        {(
                                          Number(entry.unit_price) *
                                          entry.quantities
                                            .filter(
                                              (qty) =>
                                                qty !== "" &&
                                                qty !== null &&
                                                qty !== undefined
                                            )
                                            .map((qty) => Number(qty))
                                            .reduce((sum, qty) => sum + qty, 0)
                                        ).toFixed(2)}
                                      </span>
                                      <span>
                                        Pack Size: {entry.pack_size || "N/A"}
                                      </span>
                                      <span
                                        className={`kit-component-balance ${getStockLevelClass(
                                          getRemainingBalanceForBatch(
                                            entry,
                                            fieldIndex
                                          )
                                        )}`}
                                      >
                                        Available Balance:{" "}
                                        {getRemainingBalanceForBatch(
                                          entry,
                                          fieldIndex
                                        )}{" "}
                                        {getUOMWithFallback(entry)}
                                        {quantity &&
                                          parseFloat(quantity) > 0 && (
                                            <span className="current-usage">
                                              {" "}
                                              (Using:{" "}
                                              {parseFloat(quantity).toFixed(
                                                2
                                              )}{" "}
                                              {getUOMWithFallback(entry)})
                                            </span>
                                          )}
                                      </span>
                                      <span className="total-balance-info">
                                        {/* Total Balance:{" "}
                                        {formatBalance(entry.qty_balance)}{" "}
                                        {getUOMWithFallback(entry)} |  */}
                                        Overall Remaining:{" "}
                                        {getCurrentRemainingBalance(
                                          entry,
                                          fieldIndex
                                        )}{" "}
                                        {getUOMWithFallback(entry)}
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
                                          onBlur={(e) =>
                                            handleNonKitInputBlur(
                                              e,
                                              entryIndex,
                                              fieldIndex
                                            )
                                          }
                                        />
                                        <label>Quantity</label>
                                      </div>
                                      <div className="kit-component-quantity">
                                        <input
                                          type="text"
                                          name={`batch-${fieldIndex}`}
                                          value={
                                            entry.batches?.[fieldIndex] || ""
                                          }
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
                      {/* Kit Components Section with Dynamic Batches */}
                      {/* Kit Components Section with Improved Layout */}
                      {entry.isKit &&
                        entry.kitData &&
                        entry.kitData.length > 0 && (
                          <div className="kit-components-section">
                            <div className="kit-components-header">
                              <h4>Kit Components:</h4>
                              <p className="kit-info">
                                Enter quantities for each kit component and
                                batch
                              </p>
                            </div>
                            <div className="kit-components-container">
                              {entry.kitData.map((kitItem, kitIndex) => (
                                <div
                                  key={kitIndex}
                                  className="kit-component-item"
                                >
                                  {/* Component Header Row - Component Name, Number of Batches, and HSN/SAC in one line */}
                                  <div className="kit-component-header-row">
                                    <div className="kit-component-title">
                                      <strong>Component {kitIndex + 1}:</strong>{" "}
                                      {kitItem.prod_desc}
                                    </div>
                                    <div className="kit-component-controls">
                                      <div className="batch-count-input">
                                        <input
                                          type="number"
                                          name={`kit-noOfBatches-${kitIndex}`}
                                          min={1}
                                          max={10}
                                          value={kitItem.noOfBatches || 1}
                                          onChange={(e) =>
                                            handleKitComponentBatchCountChange(
                                              entryIndex,
                                              kitIndex,
                                              e.target.value
                                            )
                                          }
                                          onFocus={handleKitInputFocus}
                                          onBlur={handleKitInputBlur}
                                        />
                                        <label>Number of Batches</label>
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

                                  {/* Dynamic Batch Fields - Pack Size/Balance/Remaining on left, Quantity/Batch No. on right */}
                                  <div className="kit-batches-container">
                                    {kitItem.batches &&
                                      kitItem.batches
                                        .slice(0, kitItem.noOfBatches || 1)
                                        .map((batch, batchIndex) => (
                                          <div
                                            key={batchIndex}
                                            className="kit-batch-row"
                                          >
                                            <div className="kit-batch-header">
                                              Batch {batchIndex + 1}
                                            </div>

                                            {/* Batch Information Row - Info on left, Input fields on right */}
                                            <div className="kit-batch-content">
                                              {/* Left side - Pack Size, Balance, Remaining */}
                                              <div className="kit-batch-info-left">
                                                <div className="kit-batch-info-item">
                                                  <span className="info-label">
                                                    Pack Size:
                                                  </span>
                                                  <span className="info-value">
                                                    {batch.packSize}
                                                  </span>
                                                </div>
                                                <div className="kit-batch-info-item">
                                                  <span className="info-label">
                                                    Balance:
                                                  </span>
                                                  <span className="info-value">
                                                    {batch.balance}
                                                  </span>
                                                </div>
                                                <div className="kit-batch-info-item">
                                                  <span className="info-label">
                                                    Remaining:
                                                  </span>
                                                  <span
                                                    className={`info-value remaining-value ${getStockLevelClass(
                                                      batch.remaining
                                                    )}`}
                                                  >
                                                    {batch.remaining}
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Right side - Quantity and Batch Number input fields */}
                                              <div className="kit-batch-inputs-right">
                                                <div className="kit-component-quantity">
                                                  <input
                                                    type="number"
                                                    name={`kit-batch-quantity-${kitIndex}-${batchIndex}`}
                                                    value={batch.quantity || ""}
                                                    onChange={(e) =>
                                                      handleKitBatchChange(
                                                        entryIndex,
                                                        kitIndex,
                                                        batchIndex,
                                                        "quantity",
                                                        e.target.value
                                                      )
                                                    }
                                                    placeholder=" "
                                                    min="0"
                                                    step="0.01"
                                                    onFocus={
                                                      handleKitInputFocus
                                                    }
                                                    onBlur={(e) =>
                                                      handleKitBatchQuantityBlur(
                                                        e,
                                                        entryIndex,
                                                        kitIndex,
                                                        batchIndex
                                                      )
                                                    }
                                                  />
                                                  <label>Quantity</label>
                                                </div>
                                                <div className="kit-component-quantity">
                                                  <input
                                                    type="text"
                                                    name={`kit-batch-number-${kitIndex}-${batchIndex}`}
                                                    value={batch.batchNo || ""}
                                                    onChange={(e) =>
                                                      handleKitBatchChange(
                                                        entryIndex,
                                                        kitIndex,
                                                        batchIndex,
                                                        "batchNo",
                                                        e.target.value
                                                      )
                                                    }
                                                    placeholder=" "
                                                    onFocus={
                                                      handleKitInputFocus
                                                    }
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
