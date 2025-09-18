import ChessGame from './ChessGame'
import './App.css'

function App() {
  const handleGameEnd = (result: string) => {
    alert(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 flex flex-col items-center justify-center p-4">
      <ChessGame onGameEnd={handleGameEnd} />
    </div>
  )
}

export default App
