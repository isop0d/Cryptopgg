import { Link } from 'react-router-dom'

function Navbar() {
    return (
        <nav className="navbar">
            <div className="nav-container">
                <div className="nav-logo">
                    <Link to="/">CryptOP.GG</Link>
                </div>
                <ul className="nav-menu">
                    <li className="nav-item">
                        <Link to="/" className="nav-link">Home</Link>
                    </li>
                    <li className="nav-item">
                        <Link to="/forum" className="nav-link">Forum</Link>
                    </li>
                </ul>
            </div>
        </nav>
    )
}

export default Navbar 