import "./HomePage.css"
import { useAuth } from "../../context/AuthContext"
import { Tabs } from "antd"
import CustomerHomeCards from "../../components/HomeCards/CustomerHomeCards"
import SupplierHomeCards from "../../components/HomeCards/SupplierHomeCards"

export default function CompletePage() {
  const { user } = useAuth()

  return (
    <>
      <div></div>
      <Tabs
        defaultActiveKey="1"
        centered
        size={"large"}
        style={{
          gap: 50,
        }}
        items={[
          {
            label: `Customer`,
            key: 1,
            children: <CustomerHomeCards />,
          },
          {
            label: `Supplier`,
            key: 2,
            children: <SupplierHomeCards />,
          },
        ]}
      />
      <div> </div>
    </>
  )
}
