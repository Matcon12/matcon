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
    console.log(
      "Filtering suggestions:",
      data,
      "Search value:",
      search_value,
      "Value:",
      value
    )
    const filtered = data.filter((item) =>
      item[search_value]?.toLowerCase().includes(value.toLowerCase())
    )
    console.log("Filtered suggestions:", filtered)
    return filtered
  }

  const handleSpecialChange = (name, value) => {
    if (!array || index === undefined) return

    if (name === "poSlNo") {
      const selectedItem = data.find((item) => item.po_sl_no === value)
      const isKit = selectedItem?.prod_code?.startsWith("KIT")

      if (isKit) {
        const kitProducts = getKitProducts(value).map((kitItem) => ({
          noOfBatches: 1,
          poSlNo: kitItem.po_sl_no,
          hsnSac: kitItem.hsnSac,
          prod_desc: kitItem.prod_desc,
          quantities: [""],
          batches: [""],
          cocs: [""],
        }))

        setMainData((prev) => {
          const updated = [...prev]
          updated.splice(index + 1, 0, ...kitProducts)
          return updated
        })
      }

      setMainData((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          [name]: value,
          hsnSac: getFieldByPoSlNo(value, "hsnSac"),
          prodCode: getFieldByPoSlNo(value, "prod_code"),
          prod_desc: getFieldByPoSlNo(value, "prod_desc"),
        }
        return updated
      })
    }

    if (name === "prod_code") {
      setMainData((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          [name]: value,
          hsnSac: getFieldByPoSlNo(value, "hsnSac"),
        }
        return updated
      })
    }

    if (name === "prodId") {
      console.log("Handling prodId change:", value, "Index:", index)
      setMainData((prev) => {
        const updated = [...prev]
        updated[index] = {
          ...updated[index],
          [name]: value,
        }
        console.log("Updated mainData:", updated)
        return updated
      })
    }
  }

  const handleChange = (e) => {
    setIsFocused(true)
    const { name, value } = e.target

    if (
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
    console.log(
      "Suggestion clicked:",
      suggestion,
      "Value:",
      value,
      "Name:",
      name,
      "Search value:",
      search_value
    )

    if (
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

  const handleFocus = () => setIsFocused(true)
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
