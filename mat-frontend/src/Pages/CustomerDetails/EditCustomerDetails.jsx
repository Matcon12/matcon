import "./CustomerDetails.css"
import { Link } from "react-router-dom"
import { useState, useEffect } from "react"
import api from "../../api/api.jsx"
import AutoCompleteComponent from "../../components/AutoComplete/AutoCompleteComponent.jsx"

import { ToastContainer, toast } from "react-toastify"

import "react-toastify/dist/ReactToastify.css"

export default function EditCustomerDetails() {
  const initialFormData = {
    cust_id: "",
    cust_name: "",
    cust_addr1: "",
    cust_addr2: "",
    cust_city: "",
    cust_st_code: "",
    cust_st_name: "",
    cust_pin: "",
    cust_gst_id: "",
    contact_name_1: "",
    contact_phone_1: "",
    contact_email_1: "",
    contact_name_2: "",
    contact_phone_2: "",
    contact_email_2: "",
    gst_exemption: 0,
  }
  const [formData, setFormData] = useState(initialFormData)
  const [customerData, setCustomerData] = useState(0)
  const [filteredCustomerData, setFilteredCustomerData] = useState()
  const [stateData, setStateData] = useState()
  const [filteredStateData, setFilteredStateData] = useState([])

  useEffect(() => {
    api.get("/getCustomerData").then((response) => {
      setCustomerData(response.data.customerData)
    })
    api.get("/getStateData").then((response) => {
      let state_data = response.data.state_data
      setStateData(state_data)
    })
  }, [])

  useEffect(() => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      cust_st_code: stateData?.find(
        (state) => state.state_name === formData.cust_st_name
      )?.state_code,
    }))
  }, [formData.cust_st_name, stateData, filteredStateData])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: value,
    }))
  }

  const getCustomerDetails = () => {
    resetFormExcludeCustId()
    api
      .get("/getCustomerDetails", {
        params: { cust_id: formData.cust_id },
      })
      .then(async (response) => {
        console.log(response.data)
        // await resetForm()
        toast.success("Successfully fetched customer details!!")
        setFormData((prevFormData) => ({
          ...prevFormData,
          cust_name: response.data.cust_name,
          cust_addr1: response.data.cust_addr1,
          cust_addr2: response.data.cust_addr2,
          cust_city: response.data.cust_city,
          cust_st_code: response.data.cust_st_code,
          cust_st_name: response.data.cust_st_name,
          cust_pin: response.data.cust_pin,
          cust_gst_id: response.data.cust_gst_id,
          contact_name_1: response.data.contact_name_1,
          contact_phone_1: response.data.contact_phone_1,
          contact_email_1: response.data.contact_email_1,
          contact_name_2: response.data.contact_name_2,
          contact_phone_2: response.data.contact_phone_2,
          contact_email_2: response.data.contact_email_2,
          gst_exemption: response.data.gst_exemption ? 1 : 0,
        }))
      })
      .catch((error) => {
        toast.error("Error in fetching the customer details")
      })
  }

  const resetForm = () => {
    setFormData(initialFormData)
  }
  const resetFormExcludeCustId = () => {
    setFormData({
      ...formData,
      cust_name: "",
      cust_addr1: "",
      cust_addr2: "",
      cust_city: "",
      cust_st_code: "",
      cust_st_name: "",
      cust_pin: "",
      cust_gst_id: "",
      contact_name_1: "",
      contact_phone_1: "",
      contact_email_1: "",
      contact_name_2: "",
      contact_phone_2: "",
      contact_email_2: "",
      gst_exemption: 0,
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (validateForm()) {
      api
        .put(
          "/updateCustomerDetails",
          { formData },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        )
        .then((response) => {
          console.log(response.data)
          toast.success("Form updated successfully!!")
          resetForm()
        })
        .catch((error) => {
          console.error("Error updating data: ", error)
          toast.error("Error udating data")
        })
    } else {
      console.log("Validation Error!!")
    }
  }

  const [formErrors, setFormErrors] = useState({
    Cust_PIN: "",
    Cust_GST_ID: "",
    contact_phone_1: "",
    contact_phone_2: "",
  })

  const validateForm = () => {
    let valid = true
    const errors = {
      Cust_PIN: "",
      Cust_GST_ID: "",
      contact_phone_1: "",
      contact_phone_2: "",
    }

    //validation for Pincode
    if (formData.cust_pin && !/^\d{6}$/.test(formData.cust_pin)) {
      errors.Cust_PIN = "City PIN must be exactly 6 digits"
      valid = false
    }

    //validation for GST ID
    if (
      formData.cust_gst_id &&
      !/^[A-Za-z0-9]{15}$/.test(formData.cust_gst_id)
    ) {
      errors.Cust_GST_ID = "GST ID must be exactly 15 alphanumeric characters"
      valid = false
    }

    //validation for phone number 1
    if (
      formData.contact_phone_1 &&
      !/^\d{10}$/.test(formData.contact_phone_1)
    ) {
      errors.contact_phone_1 = "Phone number must be exactly 10 digits"
      valid = false
    }

    //validation for phone number 2
    if (
      formData.contact_phone_2 &&
      !/^\d{10}$/.test(formData.contact_phone_2)
    ) {
      errors.contact_phone_2 = "Phone number must be exactly 10 digits"
      valid = false
    }

    setFormErrors(errors)
    return valid
  }

  return (
    <div className="addCustomerDetails-complete-container">
      <div className="addCustomerDetails-header-container">
        <h1>Edit Customer Details</h1>
        <Link to="/add_customer_details">New Customer</Link>
      </div>
      <div className="addCustomerDetails-form-container">
        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="only-inputs">
            <div className="autocomplete-wrapper">
              <AutoCompleteComponent
                data={customerData}
                mainData={formData}
                setData={setCustomerData}
                setMainData={setFormData}
                // handleChange={handleChange}
                filteredData={filteredCustomerData}
                setFilteredData={setFilteredCustomerData}
                name="cust_id"
                placeholder="Customer ID"
                search_value="cust_id"
              />
            </div>
            <div className="get-data-container">
              <button
                type="button"
                onClick={getCustomerDetails}
                className="get-data-button"
              >
                Get Data
              </button>
            </div>
            <div>
              <input
                type="text"
                required={true}
                name="cust_name"
                value={formData.cust_name}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Customer Name"
                placeholder="Customer Name"
              ></label>
            </div>
            <div>
              <input
                type="text"
                required={true}
                name="cust_addr1"
                value={formData.cust_addr1}
                onChange={handleChange}
                placeholder=" "
              />
              <label alt="Enter the Address 1" placeholder="Address 1"></label>
            </div>
            <div>
              <input
                type="text"
                //required={true}
                name="cust_addr2"
                value={formData.cust_addr2}
                onChange={handleChange}
                placeholder=" "
              />
              <label alt="Enter the Address 2" placeholder="Address 2"></label>
            </div>
            <div>
              <input
                type="text"
                required={true}
                name="cust_city"
                value={formData.cust_city}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Customer City"
                placeholder="Customer City"
              ></label>
            </div>
            <div className="autocomplete-wrapper">
              <AutoCompleteComponent
                data={stateData}
                mainData={formData}
                // setData={setStateData}
                setMainData={setFormData}
                filteredData={filteredStateData}
                setFilteredData={setFilteredStateData}
                name="cust_st_name"
                placeholder="State Name"
                search_value="state_name"
                required={true}
              />
            </div>
            <div>
              <input
                type="text"
                //required={true}
                name="cust_st_code"
                value={formData.cust_st_code}
                onChange={handleChange}
                readOnly="readonly"
                placeholder=" "
              />
              <label
                alt="Enter the Customer State Code"
                placeholder="State Code"
              ></label>
            </div>
            <div>
              <input
                type="text"
                required={true}
                name="cust_pin"
                value={formData.cust_pin}
                onChange={handleChange}
                placeholder=" "
              />
              <label alt="Enter the Customer PIN" placeholder="PIN"></label>
              {formErrors.Cust_PIN && (
                <span className="error">{formErrors.Cust_PIN}</span>
              )}
            </div>
            <div>
              <input
                type="text"
                required={true}
                name="cust_gst_id"
                value={formData.cust_gst_id}
                onChange={handleChange}
                placeholder=" "
              />
              <label alt="Enter the GST ID" placeholder="GSTIN"></label>
              {formErrors.Cust_GST_ID && (
                <span className="error">{formErrors.Cust_GST_ID}</span>
              )}
            </div>
            <div className="input-container">
              <select
                name="gst_exemption"
                value={formData.gst_exemption}
                onChange={handleChange}
                // required
              >
                <option value="" disabled>
                  Select an option
                </option>
                <option value="0">No</option>
                <option value="1">Yes</option>
              </select>
              <label alt="Select an Option" placeholder="Gst Exemption"></label>
            </div>
            <div className="grid-column-1">
              <input
                type="text"
                //required={true}
                name="contact_name_1"
                value={formData.contact_name_1}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Contact Name 1"
                placeholder="Contact Name 1"
              ></label>
            </div>
            <div>
              <input
                type="text"
                //required={true}
                name="contact_phone_1"
                value={formData.contact_phone_1}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Contact Phone Number 1"
                placeholder="Contact Phone 1"
              ></label>
              {formErrors.contact_phone_1 && (
                <span className="error">{formErrors.contact_phone_1}</span>
              )}
            </div>
            <div className="grid-column-2">
              <input
                type="text"
                //required={true}
                name="contact_email_1"
                value={formData.contact_email_1}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Contact Email 1"
                placeholder="Contact Email 1"
              ></label>
            </div>
            <div className="grid-column-1">
              <input
                type="text"
                //required={true}
                name="contact_name_2"
                value={formData.contact_name_2}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Contact Name 2"
                placeholder="Contact Name 2"
              ></label>
            </div>
            <div>
              <input
                type="text"
                //required={true}
                name="contact_phone_2"
                value={formData.contact_phone_2}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Contact Phone Number 2"
                placeholder="Contact Phone 2"
              ></label>
              {formErrors.contact_phone_2 && (
                <span className="error">{formErrors.contact_phone_2}</span>
              )}
            </div>
            <div className="grid-column-2">
              <input
                type="text"
                //required={true}
                name="contact_email_2"
                value={formData.contact_email_2}
                onChange={handleChange}
                placeholder=" "
              />
              <label
                alt="Enter the Contact Email 1"
                placeholder="Contact Email 1"
              ></label>
            </div>
          </div>
          <div className="customer-update-button-container">
            <button type="submit">UPDATE CUSTOMER</button>
            {/* <button onClick={resetForm}>CLEAR</button> */}
          </div>
        </form>
      </div>
      <ToastContainer />
    </div>
  )
}
