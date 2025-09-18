import React, { useState, useRef, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Bots } from './bots';
import type { Bot } from './bots';
import { move as makeMove } from './engine';
import './ChessGame.css';

interface ChessGameProps {
    onGameEnd?: (result: string) => void;
}

type Square = 'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8' | 'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7' | 'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6' | 'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5' | 'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4' | 'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3' | 'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2' | 'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1';

const ChessGame: React.FC<ChessGameProps> = ({ onGameEnd }) => {
    const chessGameRef = useRef(new Chess());

    const [chessPosition, setChessPosition] = useState(chessGameRef.current.fen());
    const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate' | 'draw' | 'stalemate'>('playing');
    const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
    const [isThinking, setIsThinking] = useState(false);
    const [moveFrom, setMoveFrom] = useState('');
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
    const [playerSide, setPlayerSide] = useState<'white' | 'black'>('white');
    const [opponentLevel, setOpponentLevel] = useState<string>('Easy (Skill 1, Depth 10)');
    const [playerBot, setPlayerBot] = useState<Bot | null>(null);
    const [opponentBot, setOpponentBot] = useState<Bot | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    // Reset the game
    const resetGame = () => {
        setIsResetting(true);
        setTimeout(() => {
            chessGameRef.current = new Chess();
            setChessPosition(chessGameRef.current.fen());
            setGameStatus('playing');
            setCurrentPlayer('white');
            setIsThinking(false);
            setMoveFrom('');
            setOptionSquares({});
            setIsResetting(false);
        }, 500); // Small delay to show the resetting message
    };

    // Reset game when player side changes
    useEffect(() => {
        resetGame();
    }, [playerSide]);

    // Initialize bots when opponentLevel changes
    useEffect(() => {
        setPlayerBot(Bots[`Beginner (Skill 0, Depth 5)`]()); // Player bot for hints
        setOpponentBot(Bots[opponentLevel]());
    }, [opponentLevel]);

    // Make opponent move automatically when it's their turn
    useEffect(() => {
        const makeOpponentMove = async () => {
            if (gameStatus !== 'playing') return;

            const isWhiteTurn = chessGameRef.current.turn() === 'w';
            const isOpponentTurn = (playerSide === 'white' && !isWhiteTurn) || (playerSide === 'black' && isWhiteTurn);

            if (isOpponentTurn && opponentBot) {
                setIsThinking(true);
                // Add a delay before making the move to make it feel more natural
                setTimeout(async () => {
                    try {
                        const move = await opponentBot.move(chessPosition);
                        const result = makeMove(chessPosition, move.from, move.to);
                        if (result) {
                            const [newFen] = result;
                            chessGameRef.current.load(newFen as string);
                            setChessPosition(newFen as string);
                            setCurrentPlayer(chessGameRef.current.turn() === 'w' ? 'white' : 'black');

                            // Check game status
                            if (chessGameRef.current.isGameOver()) {
                                if (chessGameRef.current.isCheckmate()) {
                                    setGameStatus('checkmate');
                                    onGameEnd?.(`${chessGameRef.current.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`);
                                } else if (chessGameRef.current.isDraw()) {
                                    setGameStatus('draw');
                                    onGameEnd?.('Game ended in a draw!');
                                } else if (chessGameRef.current.isStalemate()) {
                                    setGameStatus('stalemate');
                                    onGameEnd?.('Game ended in a stalemate!');
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error making opponent move:', error);
                    } finally {
                        setIsThinking(false);
                    }
                }, 1000); // 1 second delay
            }
        };

        makeOpponentMove();
    }, [chessPosition, opponentBot, playerSide, gameStatus, onGameEnd]);

    // Get a hint from the AI
    const getHint = async () => {
        if (gameStatus !== 'playing') return;

        const isWhiteTurn = chessGameRef.current.turn() === 'w';
        const isPlayerTurn = (playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn);

        if (isPlayerTurn && playerBot) {
            setIsThinking(true);
            try {
                const move = await playerBot.move(chessPosition);
                // Highlight the suggested move
                setOptionSquares({
                    [move.from]: {
                        background: 'rgba(255, 255, 0, 0.4)'
                    },
                    [move.to]: {
                        background: 'rgba(255, 0, 0, 0.4)'
                    }
                });
            } catch (error) {
                console.error('Error getting hint:', error);
            } finally {
                setIsThinking(false);
            }
        }
    };

    // Get the move options for a square to show valid moves
    const getMoveOptions = (square: string) => {
        // Get the moves for the square
        const moves = chessGameRef.current.moves({
            square: square as Square,
            verbose: true
        });

        // If no moves, clear the option squares
        if (moves.length === 0) {
            setOptionSquares({});
            return false;
        }

        // Create a new object to store the option squares
        const newSquares: Record<string, React.CSSProperties> = {};

        // Loop through the moves and set the option squares
        for (const move of moves) {
            newSquares[move.to] = {
                background: chessGameRef.current.get(move.to as Square) &&
                    chessGameRef.current.get(move.to as Square)?.color !== chessGameRef.current.get(square as Square)?.color
                    ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)' // larger circle for capturing
                    : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)', // smaller circle for moving
                borderRadius: '50%'
            };
        }

        // Set the square clicked to move from to yellow
        newSquares[square] = {
            background: 'rgba(255, 255, 0, 0.4)'
        };

        // Set the option squares
        setOptionSquares(newSquares);

        // Return true to indicate that there are move options
        return true;
    };

    // Handle square click
    const onSquareClick = (args: { piece: { pieceType: string } | null; square: string; }) => {
        // Check if it's player's turn
        const isWhiteTurn = chessGameRef.current.turn() === 'w';
        const isPlayerTurn = (playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn);

        if (!isPlayerTurn || gameStatus !== 'playing') {
            return;
        }

        // Piece clicked to move
        if (!moveFrom && args.piece) {
            // Get the move options for the square
            const hasMoveOptions = getMoveOptions(args.square);

            // If move options, set the moveFrom to the square
            if (hasMoveOptions) {
                setMoveFrom(args.square);
            }

            // Return early
            return;
        }

        // Square clicked to move to, check if valid move
        const moves = chessGameRef.current.moves({
            square: moveFrom as Square,
            verbose: true
        });
        const foundMove = moves.find((m) => m.from === moveFrom && m.to === args.square);

        // Not a valid move
        if (!foundMove) {
            // Check if clicked on new piece
            const hasMoveOptions = getMoveOptions(args.square);

            // If new piece, setMoveFrom, otherwise clear moveFrom
            setMoveFrom(hasMoveOptions ? args.square : '');

            // Return early
            return;
        }

        // Is normal move
        try {
            chessGameRef.current.move({
                from: moveFrom,
                to: args.square,
                promotion: 'q'
            });
        } catch {
            // If invalid, setMoveFrom and getMoveOptions
            const hasMoveOptions = getMoveOptions(args.square);

            // If new piece, setMoveFrom, otherwise clear moveFrom
            if (hasMoveOptions) {
                setMoveFrom(args.square);
            }

            // Return early
            return;
        }

        // Update the position state
        setChessPosition(chessGameRef.current.fen());
        setCurrentPlayer(chessGameRef.current.turn() === 'w' ? 'white' : 'black');

        // Check game status
        if (chessGameRef.current.isGameOver()) {
            if (chessGameRef.current.isCheckmate()) {
                setGameStatus('checkmate');
                onGameEnd?.(`${chessGameRef.current.turn() === 'w' ? 'White' : 'Black'} wins by checkmate!`);
            } else if (chessGameRef.current.isDraw()) {
                setGameStatus('draw');
                onGameEnd?.('Game ended in a draw!');
            } else if (chessGameRef.current.isStalemate()) {
                setGameStatus('stalemate');
                onGameEnd?.('Game ended in a stalemate!');
            }
        }

        // Clear moveFrom and optionSquares
        setMoveFrom('');
        setOptionSquares({});
    };

    // Handle piece drop
    const onPieceDrop = (args: { sourceSquare: string; targetSquare: string | null }) => {
        // Type narrow targetSquare potentially being null (e.g. if dropped off board)
        if (!args.targetSquare) {
            return false;
        }

        // Check if it's player's turn
        const isWhiteTurn = chessGameRef.current.turn() === 'w';
        const isPlayerTurn = (playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn);

        if (!isPlayerTurn || gameStatus !== 'playing') {
            return false;
        }

        // Try to make the move according to chess.js logic
        try {
            const result = makeMove(chessPosition, args.sourceSquare, args.targetSquare);

            // If move was successful
            if (result) {
                const [newFen] = result;
                chessGameRef.current.load(newFen as string);
                // Update the position state upon successful move to trigger a re-render of the chessboard
                setChessPosition(newFen as string);
                setCurrentPlayer(chessGameRef.current.turn() === 'w' ? 'white' : 'black');

                // Check game status
                if (chessGameRef.current.isGameOver()) {
                    if (chessGameRef.current.isCheckmate()) {
                        setGameStatus('checkmate');
                        onGameEnd?.(`${chessGameRef.current.turn() === 'w' ? 'Black' : 'White'} wins by checkmate!`);
                    } else if (chessGameRef.current.isDraw()) {
                        setGameStatus('draw');
                        onGameEnd?.('Game ended in a draw!');
                    } else if (chessGameRef.current.isStalemate()) {
                        setGameStatus('stalemate');
                        onGameEnd?.('Game ended in a stalemate!');
                    }
                }

                // Clear moveFrom and optionSquares
                setMoveFrom('');
                setOptionSquares({});

                // Return true as the move was successful
                return true;
            }

            return false;
        } catch {
            // Return false as the move was not successful
            return false;
        }
    };

    // Handle the piece drag
    const onPieceDragBegin = (args: { isSparePiece: boolean; piece: { pieceType: string }; square: string | null; }) => {
        // Check if it's player's turn
        const isWhiteTurn = chessGameRef.current.turn() === 'w';
        const isPlayerTurn = (playerSide === 'white' && isWhiteTurn) || (playerSide === 'black' && !isWhiteTurn);

        if (!isPlayerTurn || gameStatus !== 'playing') {
            return;
        }

        // Show move options when dragging a piece
        if (args.square) {
            getMoveOptions(args.square);
        }
    };

    // Handle square right click
    const onSquareRightClick = () => {
        // Clear the move squares
        setMoveFrom('');
        setOptionSquares({});
    };

    // Set the chessboard options
    const chessboardOptions = {
        onPieceDrop,
        onSquareClick,
        onSquareRightClick,
        onPieceDragBegin,
        position: chessPosition,
        squareStyles: optionSquares,
        id: 'click-or-drag-to-move',
        arePremovesAllowed: true,
        customBoardStyle: {
            borderRadius: '4px',
            boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
        },
        // Flip the board based on player's side
        arePiecesDraggable: true,
        boardOrientation: playerSide as 'white' | 'black'
    };

    return (
        <div className="chess-game-container">
            <div className="chess-game-header">
                <h2 className="chess-game-title">
                    Chess Coach
                </h2>

                {isResetting ? (
                    <div className="resetting-message">
                        Resetting game...
                    </div>
                ) : (
                    <>
                        <div className="settings-container">
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

                        <div className="turn-indicators">
                            <div className={`turn-indicator ${currentPlayer === 'white' ? 'active' : 'inactive'}`}>
                                White's Turn
                            </div>
                            <div className={`turn-indicator ${currentPlayer === 'black' ? 'active' : 'inactive'}`}>
                                Black's Turn
                            </div>

                            <button
                                onClick={getHint}
                                disabled={isThinking || gameStatus !== 'playing'}
                                className="hint-button"
                            >
                                Get Hint
                            </button>
                        </div>
                    </>
                )}
                <div className="status-container">
                    {isThinking && (
                        <div className="thinking-message">
                            AI is thinking...
                        </div>
                    )}
                    {gameStatus !== 'playing' && (
                        <div className="game-status-message">
                            {gameStatus === 'checkmate' && 'Checkmate!'}
                            {gameStatus === 'draw' && 'Draw!'}
                            {gameStatus === 'stalemate' && 'Stalemate!'}
                        </div>
                    )}
                </div>
            </div>

            <div className="chessboard-container">
                <Chessboard options={chessboardOptions} />
            </div>

            <div className="new-game-button-container">
                <button
                    onClick={resetGame}
                    className="new-game-button"
                >
                    New Game
                </button>
            </div>
        </div>
    );
}

export default ChessGame;