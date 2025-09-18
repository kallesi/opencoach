import ChessGame from './ChessGame'
import './App.css'

function App() {
    const handleGameEnd = (result: string) => {
        alert(result);
    };

    return (
        <div className="app-container">
            <ChessGame onGameEnd={handleGameEnd} />
        </div>
    )
}

export default App
