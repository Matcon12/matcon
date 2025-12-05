const InputField = ({ name, label, value, onChange, readOnly = false }) => (
  <div>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      placeholder=" "
      readOnly={readOnly}
    />
    <label alt={`Enter the ${label}`} placeholder={label}></label>
  </div>
)

export default InputField
