import React, { useState, useRef, useEffect } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Bots } from './bots';
import type { Bot } from './bots';
import { move as makeMove } from './engine';

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
        <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-3 sm:p-4 md:p-6 min-h-screen justify-center">
            <div className="text-center w-full mb-4 sm:mb-6 md:mb-8">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 md:mb-8 text-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Chess Coach
                </h2>

                {isResetting ? (
                    <div className="text-xl md:text-2xl font-semibold text-blue-600 mb-6 md:mb-8 py-3 md:py-4 animate-pulse">
                        Resetting game...
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 mb-6 md:mb-8">
                            <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3 bg-white/80 backdrop-blur-sm p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg border border-gray-200 w-full sm:w-auto">
                                <label className="font-semibold text-gray-700 text-base md:text-lg min-w-[100px] md:min-w-[120px]">Player Side:</label>
                                <select
                                    value={playerSide}
                                    onChange={(e) => setPlayerSide(e.target.value as 'white' | 'black')}
                                    className="border-2 border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-lg font-medium w-full sm:w-auto"
                                >
                                    <option value="white">White</option>
                                    <option value="black">Black</option>
                                </select>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white/80 backdrop-blur-sm p-4 rounded-2xl shadow-lg border border-gray-200 w-full md:w-auto">
                                <label className="font-semibold text-gray-700 text-base md:text-lg min-w-[100px] md:min-w-[120px]">AI Level:</label>
                                <select
                                    value={opponentLevel}
                                    onChange={(e) => setOpponentLevel(e.target.value)}
                                    className="border-2 border-gray-300 rounded-xl px-3 py-2 md:px-4 md:py-3 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base md:text-lg font-medium w-full sm:w-auto min-w-[160px] md:min-w-[200px]"
                                >
                                    {Object.keys(Bots).map((levelName) => (
                                        <option key={levelName} value={levelName}>
                                            {levelName.replace('Stockfish Lite (Skill ', 'Level ').replace(', Depth ', ' - Depth ')}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                            <div className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-semibold text-base md:text-xl shadow-lg transition-all duration-300 ${currentPlayer === 'white'
                                ? 'bg-blue-500 text-white scale-105 ring-2 md:ring-4 ring-blue-200'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                White's Turn
                            </div>
                            <div className={`px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-2xl font-semibold text-base md:text-xl shadow-lg transition-all duration-300 ${currentPlayer === 'black'
                                ? 'bg-blue-500 text-white scale-105 ring-2 md:ring-4 ring-blue-200'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                Black's Turn
                            </div>

                            <button
                                onClick={getHint}
                                disabled={isThinking || gameStatus !== 'playing'}
                                className="px-4 py-2 md:px-8 md:py-4 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-xl md:rounded-2xl hover:from-yellow-500 hover:to-orange-500 transition-all duration-300 font-bold text-base md:text-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 ring-2 ring-yellow-200 hover:ring-orange-300 min-w-[120px] md:min-w-[180px]"
                            >
                                Get Hint
                            </button>
                        </div>
                    </>
                )}
                <div className="h-12 md:h-16 flex items-center justify-center min-h-[3rem] md:min-h-[4rem]">
                    {isThinking && (
                        <div className="text-lg md:text-xl font-semibold text-blue-600 bg-blue-50 p-2 md:p-3 rounded-lg inline-block mx-auto shadow-md animate-pulse">
                            AI is thinking...
                        </div>
                    )}
                    {gameStatus !== 'playing' && (
                        <div className="text-lg md:text-xl font-semibold text-green-700 bg-green-100 p-3 md:p-4 rounded-lg inline-block mx-auto shadow-md">
                            {gameStatus === 'checkmate' && 'Checkmate!'}
                            {gameStatus === 'draw' && 'Draw!'}
                            {gameStatus === 'stalemate' && 'Stalemate!'}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full max-w-xs sm:max-w-lg md:max-w-2xl border-4 border-gray-800 rounded-xl p-2 sm:p-3 md:p-4 bg-gradient-to-br from-amber-50 to-amber-100 shadow-xl">
                <Chessboard options={chessboardOptions} />
            </div>

            <div className="mt-8 md:mt-10">
                <button
                    onClick={resetGame}
                    className="px-6 py-3 md:px-10 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl md:rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 font-bold text-lg md:text-xl shadow-lg transform hover:scale-105 active:scale-95 ring-2 ring-blue-200 hover:ring-blue-300 min-w-[160px] md:min-w-[250px]"
                >
                    New Game
                </button>
            </div>
        </div>
    );
}

export default ChessGame;