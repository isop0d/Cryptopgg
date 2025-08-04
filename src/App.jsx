import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Home from './components/Home'
import Forum from './components/Forum'

function App() {
  return (
    <Router>
      <div className='App'>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/forum" element={<Forum />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
