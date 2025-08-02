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

  useEffect(() => {
    setFilteredData(data)
  }, [data, setFilteredData])

  const getFieldByPoSlNo = (poSlNo, field) => {
    const item = data.find((d) => d.po_sl_no === poSlNo)
    return item ? item[field] : ""
  }

  const getKitProducts = (poSlNo) => {
    const prefix = poSlNo + "."
    return data.filter((item) => item.po_sl_no.startsWith(prefix))
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
    if (!data || data.length === 0) {
      return []
    }

    const filtered = data.filter((item) => {
      const searchValue = item[search_value]
      if (!searchValue) return false
      return searchValue.toLowerCase().includes(value.toLowerCase())
    })

    return filtered
  }

  const handleSpecialChange = (name, value) => {
    if (name === "poSlNo") {
      const fieldData = getFieldByPoSlNo(value, "prod_code")
      const kitProducts = getKitProducts(value)

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

    // Call handleArrayChange if provided (for custom handling)
    if (handleArrayChange) {
      handleArrayChange(e)
    } else if (
      (name === "poSlNo" || name === "prod_code" || name === "prodId") &&
      array &&
      index !== undefined
    ) {
      handleSpecialChange(name, value)
    } else if (array && nested) {
      updateNestedArrayField(name, value)
    } else {
      updateMainField(name, value)
    }

    const filtered = filterSuggestions(value)
    setFilteredData(filtered)
    if (setPoSlNo) setPoSlNo(e.target)
  }

  const handleSuggestionClick = (suggestion) => {
    const value = suggestion[search_value]

    // Create a synthetic event for handleArrayChange
    const syntheticEvent = {
      target: {
        value: value,
        name: name,
      },
    }

    // Call handleArrayChange if provided (for custom handling)
    if (handleArrayChange) {
      handleArrayChange(syntheticEvent)
    } else if (
      (name === "poSlNo" || name === "prod_code" || name === "prodId") &&
      array &&
      index !== undefined
    ) {
      handleSpecialChange(name, value)
    } else if (array && nested) {
      updateNestedArrayField(name, value)
    } else {
      updateMainField(name, value)
    }

    setIsFocused(false)
    setFilteredData([])
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
      {isFocused && filteredData?.length > 0 && (
        <ul id="autocomplete-list" className="suggestions-list">
          {filteredData.map((suggestion, i) => (
            <li key={i} onMouseDown={() => handleSuggestionClick(suggestion)}>
              {suggestion[search_value]}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
