import {LOGO_SRC,SCHOOL} from '../../config'
export default function ExamCrest({ size = 46, animated = false, className = '', decorative = false }) {
  return <span className={`exam-crest ${className}`} style={{ '--crest-size': `${size}px` }}>
    <img src={LOGO_SRC} width={size} height={size} alt={decorative ? '' : SCHOOL.name+' logo'} draggable="false" />
  </span>
}
