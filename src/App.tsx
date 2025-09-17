import ChessGame from './ChessGame'
import './App.css'

function App() {
  const handleGameEnd = (result: string) => {
    alert(result);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <ChessGame onGameEnd={handleGameEnd} />
    </div>
  )
}

export default App
