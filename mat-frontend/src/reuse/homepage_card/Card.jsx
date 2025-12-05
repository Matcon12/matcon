import "./card.css"

export default function Card({
  img,
  hoverImg,
  name,
  className,
  redirect,
  onClickCard,
}) {
  return (
    <div
      className={`homepage-card ${className}`}
      style={{ "--hover-image": `url(${hoverImg})` }}
      onClick={() => onClickCard(redirect)}
    >
      <img className="homepage-image" src={img} alt="" />
      <p>{name}</p>
    </div>
  )
}
