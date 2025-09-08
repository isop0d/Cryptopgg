import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Home from './components/Home'
import Forum from './components/Forum'
import CreatePost from './components/CreatePost'
import PostDetail from './components/PostDetail'
import SignUp from './components/SignUp'

function App() {
  return (
    <Router>
      <div className='App'>
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/forum" element={<Forum />} />
            <Route path="/forum/create-post" element={<CreatePost />} />
            <Route path="/forum/post/:postId" element={<PostDetail />} />
            <Route path="/forum/sign-up" element={<SignUp />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
