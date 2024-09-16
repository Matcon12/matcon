export default function InvoiceValue({ amount, gt, grandTotal }) {
  let g_total = grandTotal
  let amt = amount

  function roundNumber(num, decimalPlaces = 0) {
    const factor = Math.pow(10, decimalPlaces)
    return Math.round(num * factor) / factor
  }

  function numberToWords(amount) {
    const units = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ]

    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ]

    const hundreds = [
      "",
      "Hundred",
      "Two Hundred",
      "Three Hundred",
      "Four Hundred",
      "Five Hundred",
      "Six Hundred",
      "Seven Hundred",
      "Eight Hundred",
      "Nine Hundred",
    ]

    const crore = "Crore"
    const lakh = "Lakh"

    const words = []

    if (amount === 0) {
      words.push("Zero")
    }

    if (amount >= 10000000) {
      const crores = Math.floor(amount / 10000000)
      words.push(numberToWords(crores) + " " + crore)
      amount %= 10000000
    }

    if (amount >= 100000) {
      const lakhs = Math.floor(amount / 100000)
      words.push(numberToWords(lakhs) + " " + lakh)
      amount %= 100000
    }

    if (amount >= 1000) {
      const thousands = Math.floor(amount / 1000)
      words.push(numberToWords(thousands) + " Thousand")
      amount %= 1000
    }

    if (amount >= 100) {
      const hundredsPlace = Math.floor(amount / 100)
      words.push(hundreds[hundredsPlace])
      amount %= 100
    }

    if (amount >= 20) {
      const tensPlace = Math.floor(amount / 10)
      words.push(tens[tensPlace])
      amount %= 10
    }

    if (amount > 0) {
      words.push(units[amount])
    }

    return words.join(" ")
  }

  if (grandTotal) {
    let r_amt = roundNumber(g_total)
    console.log("r_amt: ", r_amt)
    amt = numberToWords(r_amt)
  }
  return (
    <table className="invoice-value">
      <tbody>
        <tr>
          <td>
            <div>
              <p>INVOICE VALUE (in Words)</p>
              <strong>{amount}</strong>
            </div>
          </td>
          <td>Total: {gt}</td>
          {/* <td>Total: {roundNumber(grandTotal).toFixed(2)}</td> */}
        </tr>
      </tbody>
    </table>
  )
}
