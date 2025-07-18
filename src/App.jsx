import { useState } from 'react'
import './App.css'

function App() {

  const heliuskey = import.meta.env.VITE_HELIUS_API_KEY;

  const url = `https://api.helius.xyz/v0/addresses/${wallet}/balances?api-key=${heliusKey}`;

  return (
    <div>
      
    </div>
  )
}

export default App
