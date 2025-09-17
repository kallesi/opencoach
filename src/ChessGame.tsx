import React, { useState, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';

interface ChessGameProps {
    onGameEnd?: (result: string) => void;
}

const ChessGame: React.FC<ChessGameProps> = ({ onGameEnd }) => {
    const chessGameRef = useRef(new Chess());

    const [chessPosition, setChessPosition] = useState(chessGameRef.current.fen());
    const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate' | 'draw' | 'stalemate'>('playing');
    const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
    const [isThinking, setIsThinking] = useState(false);
    const [moveFrom, setMoveFrom] = useState('');
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

    // Reset the game
    const resetGame = () => {
        chessGameRef.current = new Chess();
        setChessPosition(chessGameRef.current.fen());
        setGameStatus('playing');
        setCurrentPlayer('white');
        setIsThinking(false);
        setMoveFrom('');
        setOptionSquares({});
    };

    // Make a random "CPU" move
    const makeRandomMove = () => {
        // Get all possible moves
        const possibleMoves = chessGameRef.current.moves();

        // Exit if the game is over
        if (chessGameRef.current.isGameOver()) {
            return;
        }

        // Pick a random move
        const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

        // Make the move
        chessGameRef.current.move(randomMove);

        // Update the position state
        setChessPosition(chessGameRef.current.fen());
    };

    // Get the move options for a square to show valid moves
    const getMoveOptions = (square: string) => {
        // Get the moves for the square
        const moves = chessGameRef.current.moves({
            square: square as any,
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
                background: chessGameRef.current.get(move.to as any) &&
                    chessGameRef.current.get(move.to as any)?.color !== chessGameRef.current.get(square as any)?.color
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onSquareClick = (args: any) => {
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
            square: moveFrom as any,
            verbose: true
        });
        const foundMove = moves.find((m: any) => m.from === moveFrom && m.to === args.square);

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
        } else {
            // Make random cpu move after a short delay
            setIsThinking(true);
            setTimeout(() => {
                makeRandomMove();
                setIsThinking(false);

                // Check game status after AI move
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
            }, 500);
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

        // Try to make the move according to chess.js logic
        try {
            const move = chessGameRef.current.move({
                from: args.sourceSquare,
                to: args.targetSquare,
                promotion: 'q' // Always promote to a queen for simplicity
            });

            // If move was successful
            if (move) {
                // Update the position state upon successful move to trigger a re-render of the chessboard
                setChessPosition(chessGameRef.current.fen());
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
                } else {
                    // Make AI move after a short delay
                    setIsThinking(true);
                    setTimeout(() => {
                        makeRandomMove();
                        setIsThinking(false);

                        // Check game status after AI move
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
                    }, 500);
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onPieceDragBegin = (args: any) => {
        // Show move options when dragging a piece
        getMoveOptions(args.square);
    };

    // Handle square right click
    const onSquareRightClick = () => {
        // Clear the move squares
        setMoveFrom('');
        setOptionSquares({});
    };

    // Set the chessboard options
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chessboardOptions: any = {
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
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="mb-4 text-center">
                <h2 className="text-2xl font-bold mb-2">Chess Game</h2>
                <div className="flex items-center justify-center gap-4">
                    <div className={`px-4 py-2 rounded-lg ${currentPlayer === 'white' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                        White's Turn
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${currentPlayer === 'black' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
                        Black's Turn
                    </div>
                    {isThinking && (
                        <div className="mt-2 text-lg font-semibold text-blue-600">
                            AI is thinking...
                        </div>
                    )}
                    {gameStatus !== 'playing' && (
                        <div className="mt-2 text-lg font-semibold text-green-600">
                            {gameStatus === 'checkmate' && 'Checkmate!'}
                            {gameStatus === 'draw' && 'Draw!'}
                            {gameStatus === 'stalemate' && 'Stalemate!'}
                        </div>
                    )}
                </div>

                <div className="border-4 border-gray-800 rounded-lg p-2">
                    <Chessboard options={chessboardOptions} />
                </div>

                <div className="mt-4">
                    <button
                        onClick={resetGame}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
                    >
                        New Game
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ChessGame;