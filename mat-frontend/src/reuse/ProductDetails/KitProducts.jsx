import { useEffect } from "react"
import { DatePicker, Space } from "antd"
import AutoCompleteComponent from "../../components/AutoComplete/AutoCompleteComponent"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faTrash,
  faArrowsRotate,
  faPlus,
} from "@fortawesome/free-solid-svg-icons"
import useDebounce from "../../hooks/useDebounce.jsx"
import api from "../../api/api.jsx"

export default function KitProducts({
  index,
  formData,
  setFormData,
  suggestions,
  filteredSuggestions,
  setFilteredSuggestions,
}) {
  const debouncedProdId = useDebounce(formData[index].prodId, 100)

  const handleComponentChange = (key, event) => {
    const { name, value } = event.target

    setFormData(
      formData.map((item) => {
        if (formData.indexOf(item) == key) {
          return {
            ...item,
            [name]: value,
          }
        }
        return item
      })
    )
  }

  const handleProductDelete = (index) => {
    setFormData(formData.filter((kitItem, idx) => idx !== index))
  }

  const handleProductClear = (index) => {
    const updatedFormData = [...formData]

    updatedFormData[index] = {
      poSlNo: updatedFormData[index].poSlNo,
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

    setFormData(updatedFormData)
  }

  const handleAddProduct = () => {
    const lastPoSlNo =
      formData.length > 0 ? parseFloat(formData[formData.length - 1].poSlNo) : 0
    const newPoSlNo = (lastPoSlNo + 0.1).toFixed(1)
    setFormData([
      ...formData,
      {
        poSlNo: newPoSlNo,
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
      },
    ])
  }

  useEffect(() => {
    if (!debouncedProdId) return
    api
      .get("/packSize", {
        params: {
          prodId: debouncedProdId,
        },
      })
      .then((response) => {
        setFormData(
          formData.map((productDetail, idx) => {
            if (idx === index) {
              return {
                ...productDetail,
                packSize: response.data.pack_size,
                productDesc: response.data.prod_desc,
              }
            }
            return productDetail
          })
        )
      })
      .catch((error) => {
        console.log(error.response.data.error)
      })
  }, [debouncedProdId])

  return (
    <>
      <hr />
      <div className="product-desc-only-inputs">
        <div className="productDescContainer">
          <div>
            <input
              type="text"
              required={true}
              name="poSlNo"
              value={formData[index].poSlNo}
              onChange={(e) => handleComponentChange(index, e)}
              placeholder=" "
            />
            <label alt="Enter the PO SL No" placeholder="PO SL No"></label>
          </div>
          {console.log("main data: ", formData)}
          <div className="autocomplete-wrapper">
            <AutoCompleteComponent
              data={suggestions}
              mainData={formData}
              setMainData={setFormData}
              filteredData={filteredSuggestions}
              setFilteredData={setFilteredSuggestions}
              name="prodId"
              placeholder="Product Code"
              search_value="prod_id"
              array={true}
              nested={true}
              index={index}
            />
          </div>
          <div>
            <input
              type="text"
              name="packSize"
              value={formData[index].packSize}
              onChange={(e) => handleComponentChange(index, e)}
              placeholder=" "
            />
            <label alt="Enter the Pack Size" placeholder="Pack Size"></label>
          </div>
          <div className="grid-item-textarea">
            <textarea
              name="productDesc"
              value={formData[index].productDesc}
              onChange={(e) => handleComponentChange(index, e)}
              placeholder=" "
            ></textarea>
            <label
              alt="Enter the Product Description"
              placeholder="Product Description"
            ></label>
          </div>
          <div>
            <input
              type="number"
              step="0.01"
              name="quantity"
              value={formData[index].quantity}
              onChange={(e) => handleComponentChange(index, e)}
              placeholder=" "
            />
            <label alt="Enter the Quantity" placeholder="Quantity"></label>
          </div>
          <div className="input-container">
            <select
              name="uom"
              value={formData[index].uom}
              onChange={(e) => handleComponentChange(index, e)}
            >
              <option value="" disabled>
                Select an option
              </option>
              <option value="Ltr">Ltr</option>
              <option value="Kg">Kg</option>
              <option value="No.">No.</option>
            </select>
            <label alt="Select an Option" placeholder="UOM"></label>
          </div>
        </div>
        <div className="clearAndDeleteContainer">
          {
            <>
              <div className="delete_current_product">
                <FontAwesomeIcon
                  className="deleteButton"
                  icon={faTrash}
                  onClick={() => handleProductDelete(index)}
                />
              </div>
              <div className="clear_current_product">
                <FontAwesomeIcon
                  className="clearButton"
                  icon={faArrowsRotate}
                  onClick={() => handleProductClear(index)}
                />
              </div>
              <div className="add_product">
                <FontAwesomeIcon
                  className="addButton"
                  icon={faPlus}
                  onClick={() => handleAddProduct(index)}
                />
              </div>
            </>
          }
        </div>
      </div>
    </>
  )
}
