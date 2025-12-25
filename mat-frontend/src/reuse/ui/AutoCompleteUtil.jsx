import { useEffect, useState } from "react"

export default function AutoCompleteComponent({
  data,
  mainData,
  setMainData,
  name,
  placeholder,
  search_value,
  filteredData,
  setFilteredData,
  setPoSlNo,
  index,
  array,
  required,
  readonly,
  nested,
  handleArrayChange,
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [localFilteredData, setLocalFilteredData] = useState([])

  useEffect(() => {
    setLocalFilteredData(data)
  }, [data])

  const getFieldByPoSlNo = (poSlNo, field) => {
    console.log("getFieldByPoSlNo called with:", {
      poSlNo,
      field,
      dataLength: data?.length,
    })
    const item = data.find((d) => d.po_sl_no === poSlNo)
    console.log("Found item:", item)
    return item ? item[field] : ""
  }

  const getKitProducts = (poSlNo) => {
    console.log("getKitProducts called with poSlNo:", poSlNo)
    console.log("Available data:", data)
    const prefix = poSlNo + "."
    console.log("Looking for prefix:", prefix)
    const kitProducts = data.filter((item) => item.po_sl_no.startsWith(prefix))
    console.log("Found kit products:", kitProducts)
    return kitProducts
  }

  const updateMainField = (name, value) => {
    setMainData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const updateNestedArrayField = (name, value) => {
    setMainData((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, [name]: value } : entry
      )
    )
  }

  const filterSuggestions = (value) => {
    console.log("filterSuggestions called with value:", value)
    console.log("Available data for filtering:", data)
    console.log("search_value:", search_value)

    if (!data || data.length === 0) {
      console.log("No data available for filtering")
      return []
    }

    const filtered = data.filter((item) => {
      const searchValue = item[search_value]
      console.log("Checking item:", item, "searchValue:", searchValue)
      if (!searchValue) return false
      const matches = searchValue.toLowerCase().includes(value.toLowerCase())
      console.log("Matches:", matches)
      return matches
    })

    console.log("Filtered results:", filtered)
    return filtered
  }

  const handleSpecialChange = (name, value) => {
    console.log("handleSpecialChange called with:", { name, value, index })

    if (name === "poSlNo") {
      const fieldData = getFieldByPoSlNo(value, "prod_code")
      const kitProducts = getKitProducts(value)

      console.log("fieldData found:", fieldData)
      console.log("kitProducts found:", kitProducts)

      const updated = mainData.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [name]: value,
              prod_code: fieldData?.prod_code || "",
              prod_desc: fieldData?.prod_desc || "",
              pack_size: fieldData?.pack_size || "",
              uom: fieldData?.uom || "",
              quantity: fieldData?.quantity || 0,
              unit_price: fieldData?.unit_price || 0,
              total_price: fieldData?.total_price || 0,
              qty_sent: fieldData?.qty_sent || 0,
              qty_balance: fieldData?.qty_balance || 0,
              delivery_date: fieldData?.delivery_date || null,
              hsn_sac: fieldData?.hsn_sac || "",
              location: fieldData?.location || "",
              quote_id: fieldData?.quote_id || "",
              consignee_id: fieldData?.consignee_id || "",
              podate: fieldData?.podate || "",
              po_validity: fieldData?.po_validity || "",
              additional_desc: fieldData?.additional_desc || "",
              staggered_delivery: fieldData?.staggered_delivery || "",
              kitData: kitProducts,
            }
          : item
      )

      console.log("Updated mainData:", updated)
      setMainData(updated)
    } else if (name === "prod_code" || name === "prodId") {
      const updated = mainData.map((item, idx) =>
        idx === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
      setMainData(updated)
    }
  }

  const handleChange = (e) => {
    const { value } = e.target
    console.log("handleChange called with:", {
      value,
      name,
      array,
      index,
      handleArrayChange: !!handleArrayChange,
    })

    // Call handleArrayChange if provided (for custom handling)
    if (handleArrayChange) {
      console.log("Calling handleArrayChange")
      handleArrayChange(e)
    } else if (
      (name === "poSlNo" || name === "prod_code" || name === "prodId") &&
      array &&
      index !== undefined
    ) {
      console.log("Calling handleSpecialChange")
      handleSpecialChange(name, value)
    } else if (array && nested) {
      console.log("Calling updateNestedArrayField")
      updateNestedArrayField(name, value)
    } else {
      console.log("Calling updateMainField")
      updateMainField(name, value)
    }

    const filtered = filterSuggestions(value)
    setLocalFilteredData(filtered)
    if (setPoSlNo) setPoSlNo(e.target)
  }

  const handleSuggestionClick = (suggestion) => {
    const value = suggestion[search_value]
    console.log("handleSuggestionClick called with:", {
      suggestion,
      value,
      name,
      array,
      index,
    })

    // Create a synthetic event for handleArrayChange
    const syntheticEvent = {
      target: {
        value: value,
        name: name,
      },
    }

    // Call handleArrayChange if provided (for custom handling)
    if (handleArrayChange) {
      console.log("Calling handleArrayChange from suggestion click")
      handleArrayChange(syntheticEvent)
    } else if (
      (name === "poSlNo" || name === "prod_code" || name === "prodId") &&
      array &&
      index !== undefined
    ) {
      console.log("Calling handleSpecialChange from suggestion click")
      handleSpecialChange(name, value)
    } else if (array && nested) {
      console.log("Calling updateNestedArrayField from suggestion click")
      updateNestedArrayField(name, value)
    } else {
      console.log("Calling updateMainField from suggestion click")
      updateMainField(name, value)
    }

    setIsFocused(false)
    setLocalFilteredData([])
  }

  const handleFocus = () => {
    setIsFocused(true)
  }
  const handleBlur = () => setIsFocused(false)

  const inputValue = array
    ? mainData[index]?.[name] ?? ""
    : mainData?.[name] ?? ""

  return (
    <>
      <input
        type="text"
        placeholder=" "
        name={name}
        value={inputValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-autocomplete="list"
        aria-controls="autocomplete-list"
        required={required}
        readOnly={readonly}
      />
      <label alt="" placeholder={placeholder}></label>
      {isFocused && localFilteredData?.length > 0 && (
        <ul id="autocomplete-list" className="suggestions-list">
          {localFilteredData.map((suggestion, i) => (
            <li key={i} onMouseDown={() => handleSuggestionClick(suggestion)}>
              {suggestion[search_value]}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
