import ChessGame from './ChessGame'
import './App.css'

function App() {
    const handleGameEnd = (result: string) => {
        alert(result);
    };

    return (
        <div className="app-container">
            <div className="app-content">
                <ChessGame onGameEnd={handleGameEnd} />
            </div>
        </div>
    )
}

export default App
