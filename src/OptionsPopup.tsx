import React from 'react';
import { Bots } from './bots';
import './OptionsPopup.css';

interface OptionsPopupProps {
    playerSide: 'white' | 'black';
    setPlayerSide: (side: 'white' | 'black') => void;
    opponentLevel: string;
    setOpponentLevel: (level: string) => void;
    onClose: () => void;
}

const OptionsPopup: React.FC<OptionsPopupProps> = ({
    playerSide,
    setPlayerSide,
    opponentLevel,
    setOpponentLevel,
    onClose
}) => {
    return (
        <div className="options-popup-overlay" onClick={onClose}>
            <div className="options-popup" onClick={(e) => e.stopPropagation()}>
                <div className="options-popup-header">
                    <h3>Game Options</h3>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                <div className="options-popup-content">
                    <div className="setting-group">
                        <label className="setting-label">Player:</label>
                        <select
                            value={playerSide}
                            onChange={(e) => setPlayerSide(e.target.value as 'white' | 'black')}
                            className="setting-select"
                        >
                            <option value="white">White</option>
                            <option value="black">Black</option>
                        </select>
                    </div>

                    <div className="setting-group">
                        <label className="setting-label">AI Level:</label>
                        <select
                            value={opponentLevel}
                            onChange={(e) => setOpponentLevel(e.target.value)}
                            className="setting-select"
                        >
                            {Object.keys(Bots).map((levelName) => (
                                <option key={levelName} value={levelName}>
                                    {levelName.replace('Stockfish Lite (Skill ', 'Level ').replace(', Depth ', ' - Depth ')}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OptionsPopup;