import { useState } from 'react'
import MainPage from "./Components/MainPage";
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
     <MainPage  />
    </>
  )
}

export default App
