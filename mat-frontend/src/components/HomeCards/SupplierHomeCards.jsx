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
            name="Supplier Details"
            redirect="#"
            onClickCard={onClickCard}
          />
          <Card
            className="card-2"
            img="/003-box.png"
            hoverImg="/004-box-1.png"
            name="Product Details"
            redirect="add_product_details"
            onClickCard={onClickCard}
          />
          <Card
            className="card-3"
            img="/005-choices.png"
            hoverImg="/006-choices-1.png"
            name="Purchase Order"
            redirect="#"
            onClickCard={onClickCard}
          />
          <Card
            className="card-4"
            img="/007-invoice.png"
            hoverImg="/008-invoice-1.png"
            name="Invoice Generation"
            redirect="#"
            onClickCard={onClickCard}
          />
          <Card
            className="card-3"
            img="/001-bill.png"
            hoverImg="/002-bill-1.png"
            name="Bill of Entry"
            redirect="#"
            onClickCard={onClickCard}
          />

          <Card
            className="card-5"
            img="/009-report.png"
            hoverImg="/010-report-1.png"
            name="Reports"
            redirect="#"
            onClickCard={onClickCard}
          />
        </div>
      </div>
    </>
  )
}
