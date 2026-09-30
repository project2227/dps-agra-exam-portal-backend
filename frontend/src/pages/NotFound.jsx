import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="grid flex-1 place-items-center px-4 py-16 text-center">
        <div>
          <p className="font-mono text-6xl font-bold text-gradient">404</p>
          <h1 className="mt-4 text-2xl font-semibold">This page is not in the lab</h1>
          <p className="mt-2 text-slate-400">The link may be old or mistyped.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/" className="btn btn-primary"><Compass size={16} aria-hidden="true" /> Go home</Link>
            <Link to="/student/join" className="btn btn-ghost">Join an exam</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
