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
  // console.log("main data: ", mainData)
  // console.log(data, mainData)
  const [isFocused, setIsFocused] = useState(false)
  useEffect(() => {
    setFilteredData(data)
    // console.log(data)
  }, [data, setFilteredData])

  const handleChange = async (event) => {
    setIsFocused(true)
    const { name, value } = event.target
    console.log("entered")
    // setting hsn_sac when the poslno is selected and to add entries when the product is a kit.
    if (name == "poSlNo") {
      data.map((items, idx) => {
        console.log("entered the map function")
        // adding entries for the kit components in the invoice generation page.
        if (items.po_sl_no == value && items.prod_code.startsWith("KIT")) {
          let no = items.po_sl_no + "."
          const kit_products = data.filter((d) => d.po_sl_no.startsWith(no))
          setMainData((prevEntries) => {
            const newEntries = [...prevEntries]
            const insertIndex = idx + 1
            const newKitEntries = kit_products.map((kitItem) => {
              console.log(kitItem)
              return {
                noOfBatches: 1,
                poSlNo: kitItem.po_sl_no,
                hsnSac: kitItem.hsnSac,
                prod_desc: kitItem.prod_desc,
                quantities: [""],
                batches: [""],
                cocs: [""],
              }
            })
            newEntries.splice(insertIndex, 0, ...newKitEntries)
            return newEntries
          })
        }
      })
      setMainData((prevEntries) => {
        const newEntries = [...prevEntries]
        newEntries[index] = {
          ...newEntries[index],
          [name]: value,
          hsnSac: findHsnCodeByPoSlNo(value),
          prodCode: findProdCodeByPoSlNo(value),
          prod_desc: findProdDescByPoSlNo(value),
        }
        return newEntries
      })
      setIsFocused(false)
    } else if (name == "prod_code" && index) {
      console.log("entered")
      setMainData((prevEntries) => {
        const newEntries = [...prevEntries]
        newEntries[index] = {
          ...newEntries[index],
          [name]: value,
          hsnSac: findHsnCodeByPoSlNo(value),
        }
        return newEntries
      })
      setIsFocused(false)
    } else if (array && nested) {
      setMainData((prevEntries) =>
        prevEntries.map((entry, i) =>
          i === index ? { ...entry, [name]: value } : entry
        )
      )
      const filtered = data.filter((suggestion) => {
        // console.log(data, suggestion)
        return suggestion[search_value]
          .toLowerCase()
          .includes(value.toLowerCase())
      })
      console.log("filtered: ", filtered)
      setFilteredData(filtered)
      // setIsFocused(false)
    } else {
      setMainData((prevFormData) => ({
        ...prevFormData,
        [name]: value,
      }))
      const filtered = data.filter((suggestion) => {
        // console.log("value: ", search_value)
        // console.log("suggestion", suggestion)
        return suggestion[search_value]
          .toLowerCase()
          .includes(value.toLowerCase())
      })
      setFilteredData(filtered)
      setPoSlNo(event.target)
      setIsFocused(false)
      // console.log({ "data": data, "filtered data": filtered })
    }
  }

  const findHsnCodeByPoSlNo = (poSlNo) => {
    const item = data.find((item) => item.po_sl_no === poSlNo)
    return item ? item.hsnSac : null // Return hsn_code if found, otherwise null
  }

  const findProdCodeByPoSlNo = (poSlNo) => {
    const item = data.find((item) => item.po_sl_no == poSlNo)
    return item ? item.prod_code : null
  }

  const findProdDescByPoSlNo = (poSlNo) => {
    // console.log(data)
    const item = data.find((item) => item.po_sl_no == poSlNo)
    return item ? item.prod_desc : null
  }

  const handleSuggestionClick = (suggestion) => {
    if (array) {
      console.log(data, suggestion[search_value])

      let updatedMainData = []

      data.forEach((items, idx) => {
        if (
          items.po_sl_no === suggestion[search_value] &&
          items.prod_code.startsWith("KIT")
        ) {
          console.log(items.prod_code)
          let no = items.po_sl_no + "."
          const kit_products = data.filter((d) => d.po_sl_no.startsWith(no))

          updatedMainData = kit_products.map((kitItem) => ({
            noOfBatches: 1,
            poSlNo: kitItem.po_sl_no,
            hsnSac: kitItem.hsnSac,
            prod_desc: kitItem.prod_desc,
            quantities: [""],
            batches: [""],
            cocs: [""],
          }))

          // Update the main data with KIT products
          setMainData((prevEntries) => {
            console.log("preventries: ", prevEntries)
            console.log("updated main data: ", updatedMainData)
            console.log("insert index:", idx)
            const newEntries = [...prevEntries]
            const insertIndex = idx + 1
            newEntries.splice(index + 1, 0, ...updatedMainData)
            console.log("after updating: ", newEntries)
            return newEntries
          })
        }
      })

      // Outside update to handle other suggestion clicks
      setMainData((prevEntries) => {
        console.log("entered outside")
        const newEntries = [...prevEntries]

        // Ensure `index` is valid
        if (typeof index !== "undefined") {
          newEntries[index] = {
            ...newEntries[index],
            [name]: suggestion[search_value],
            hsnSac: findHsnCodeByPoSlNo(suggestion[search_value]),
            prodCode: findProdCodeByPoSlNo(suggestion[search_value]),
            prod_desc: findProdDescByPoSlNo(suggestion[search_value]),
          }
        }

        setIsFocused(false)
        return newEntries
      })
    } else {
      // Handle case where array is not present
      setMainData((prevFormData) => ({
        ...prevFormData,
        [name]: suggestion[search_value],
      }))
      setFilteredData([])
    }

    setIsFocused(false)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = () => {
    setIsFocused(false)
  }

  return (
    <>
      <input
        type="text"
        placeholder=" "
        name={name}
        value={array ? mainData[index][name] : mainData[name]}
        onChange={(e) => handleChange(e)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-autocomplete="list"
        aria-controls="autocomplete-list"
        required={required}
        readOnly={readonly}
      />
      <label alt="" placeholder={placeholder}></label>
      {isFocused && filteredData && filteredData.length > 0 && (
        <ul id="autocomplete-list" className="suggestions-list">
          {filteredData.map((suggestion, i) => {
            // console.log(suggestion)

            return (
              <li key={i} onMouseDown={() => handleSuggestionClick(suggestion)}>
                {suggestion[search_value]}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
