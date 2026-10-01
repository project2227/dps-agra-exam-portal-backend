export default function ExamCrest({ size = 46, animated = false, className = '', decorative = false }) {
  return <span className={`exam-crest ${animated ? 'exam-crest-animated' : ''} ${className}`} style={{ '--crest-size': `${size}px` }}>
    <img src={import.meta.env.BASE_URL + 'brand/dps-agra-crest.jpeg'} width={size} height={size} alt={decorative ? '' : 'Delhi Public School, Agra crest'} draggable="false" />
    {animated && <><i className="exam-crest-orbit" aria-hidden="true" /><i className="exam-crest-sheen" aria-hidden="true" /></>}
  </span>
}
