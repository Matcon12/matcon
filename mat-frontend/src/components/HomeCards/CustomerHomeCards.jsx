import Card from "../../reuse/homepage_card/Card"
import { useNavigate } from "react-router-dom"

export default function CustomerHomeCards() {
  const navigate = useNavigate()

  const onClickCard = (path) => {
    navigate(path)
  }
  return (
    <>
      <div className="homepage-container">
        {/* {user ? <p>Homepage</p> : <p>Signin to continue</p>} */}
        <div className="homepage-cards">
          <Card
            className="card-1"
            img="/001-people.png"
            hoverImg="/002-people-1.png"
            name="Customer Details"
            redirect="add_customer_details"
            onClickCard={onClickCard}
          />
          <Card
            className="card-3"
            img="/005-choices.png"
            hoverImg="/006-choices-1.png"
            name="Purchase Order"
            redirect="purchase_order"
            onClickCard={onClickCard}
          />
          <Card
            className="card-4"
            img="/007-invoice.png"
            hoverImg="/008-invoice-1.png"
            name="Invoice Generation"
            redirect="invoice_generation"
            onClickCard={onClickCard}
          />
          <Card
            className="card-5"
            img="/001-printer.png"
            hoverImg="/002-printer-1.png"
            name="View/Print      Invoice/DC"
            redirect="print"
            onClickCard={onClickCard}
          />
          <Card
            className="card-6"
            img="/009-report.png"
            hoverImg="/010-report-1.png"
            name="Invoice Report"
            redirect="report"
            onClickCard={onClickCard}
          />
          <Card
            className="card-7"
            img="/011-outstandingPO.png"
            hoverImg="/011-outstandingPO-1.png"
            name="Purchase Order Report"
            redirect="outstandingPO"
            onClickCard={onClickCard}
          />
        </div>
      </div>
    </>
  )
}
