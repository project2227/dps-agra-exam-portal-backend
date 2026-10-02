import { Component } from 'react'
import ExamCrest from './ExamCrest'

export default class PageErrorBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="mx-auto flex min-h-[65vh] max-w-lg flex-col items-center justify-center gap-5 px-5 text-center" role="alert">
      <ExamCrest size={56} decorative />
      <h1 className="text-2xl font-semibold">This page could not open</h1>
      <p className="text-muted">Check your connection and reload the page. Any saved exam answers will be restored when you return.</p>
      <div className="flex flex-wrap justify-center gap-3"><button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Reload page</button><a className="btn btn-ghost" href={import.meta.env.BASE_URL}>Return to the portal</a></div>
    </main>
  }
}
