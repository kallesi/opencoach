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
    const [moveComment, setMoveComment] = useState('');

    // Position analysis functions
    const analyzePosition = (game: Chess) => {
        const isCheck = game.isCheck();
        const isCheckmate = game.isCheckmate();
        const isDraw = game.isDraw();
        const materialCount = getMaterialCount(game);
        const pieceActivity = getPiecesActivity(game);
        const kingSafety = getKingSafety(game);
        const pawnStructure = getPawnStructure(game);

        return {
            isCheck,
            isCheckmate,
            isDraw,
            materialCount,
            pieceActivity,
            kingSafety,
            pawnStructure,
            centerControl: getCenterControl(game),
            pieceCoordination: getPieceCoordination(game),
            tacticalPatterns: getTacticalPatterns(game)
        };
    };

    const getMaterialCount = (game: Chess) => {
        const pieces = game.board().flat().filter(piece => piece !== null);
        let whiteMaterial = 0;
        let blackMaterial = 0;

        pieces.forEach(piece => {
            if (piece) {
                const value = getPieceValue(piece.type);
                if (piece.color === 'w') {
                    whiteMaterial += value;
                } else {
                    blackMaterial += value;
                }
            }
        });

        return {
            white: whiteMaterial,
            black: blackMaterial,
            diff: whiteMaterial - blackMaterial
        };
    };

    const getPieceValue = (pieceType: string) => {
        switch (pieceType) {
            case 'p': return 1;
            case 'n': return 3;
            case 'b': return 3;
            case 'r': return 5;
            case 'q': return 9;
            case 'k': return 0; // King has no material value
            default: return 0;
        }
    };

    const getPiecesActivity = (game: Chess) => {
        // Count number of legal moves as a measure of piece activity
        const moves = game.moves();
        return moves.length;
    };

    const getKingSafety = (game: Chess) => {
        // Simple king safety analysis based on pawn shield and piece proximity
        const board = game.board();
        let whiteKingSafety = 0;
        let blackKingSafety = 0;

        // Find kings
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.type === 'k') {
                    if (piece.color === 'w') {
                        // Check pawn shield for white king
                        if (row < 7) {
                            if (col > 0 && board[row + 1][col - 1]?.type === 'p' && board[row + 1][col - 1]?.color === 'w') whiteKingSafety += 1;
                            if (board[row + 1][col]?.type === 'p' && board[row + 1][col]?.color === 'w') whiteKingSafety += 1;
                            if (col < 7 && board[row + 1][col + 1]?.type === 'p' && board[row + 1][col + 1]?.color === 'w') whiteKingSafety += 1;
                        }
                    } else {
                        // Check pawn shield for black king
                        if (row > 0) {
                            if (col > 0 && board[row - 1][col - 1]?.type === 'p' && board[row - 1][col - 1]?.color === 'b') blackKingSafety += 1;
                            if (board[row - 1][col]?.type === 'p' && board[row - 1][col]?.color === 'b') blackKingSafety += 1;
                            if (col < 7 && board[row - 1][col + 1]?.type === 'p' && board[row - 1][col + 1]?.color === 'b') blackKingSafety += 1;
                        }
                    }
                }
            }
        }

        return {
            white: whiteKingSafety,
            black: blackKingSafety
        };
    };

    const getPawnStructure = (game: Chess) => {
        // Simple pawn structure analysis
        const board = game.board();
        let whitePawns = 0;
        let blackPawns = 0;
        let whiteDoubledPawns = 0;
        let blackDoubledPawns = 0;
        let whiteIsolatedPawns = 0;
        let blackIsolatedPawns = 0;

        for (let col = 0; col < 8; col++) {
            let whitePawnsInFile = 0;
            let blackPawnsInFile = 0;

            for (let row = 0; row < 8; row++) {
                const piece = board[row][col];
                if (piece && piece.type === 'p') {
                    if (piece.color === 'w') {
                        whitePawns++;
                        whitePawnsInFile++;
                    } else {
                        blackPawns++;
                        blackPawnsInFile++;
                    }
                }
            }

            // Check for doubled pawns
            if (whitePawnsInFile > 1) whiteDoubledPawns += whitePawnsInFile - 1;
            if (blackPawnsInFile > 1) blackDoubledPawns += blackPawnsInFile - 1;

            // Check for isolated pawns (no friendly pawns on adjacent files)
            const hasLeftNeighbor = col > 0 &&
                board.some(row => row[col - 1]?.type === 'p' && row[col - 1]?.color === 'w');
            const hasRightNeighbor = col < 7 &&
                board.some(row => row[col + 1]?.type === 'p' && row[col + 1]?.color === 'w');
            if (whitePawnsInFile > 0 && !hasLeftNeighbor && !hasRightNeighbor) whiteIsolatedPawns++;

            const hasLeftNeighborBlack = col > 0 &&
                board.some(row => row[col - 1]?.type === 'p' && row[col - 1]?.color === 'b');
            const hasRightNeighborBlack = col < 7 &&
                board.some(row => row[col + 1]?.type === 'p' && row[col + 1]?.color === 'b');
            if (blackPawnsInFile > 0 && !hasLeftNeighborBlack && !hasRightNeighborBlack) blackIsolatedPawns++;
        }

        return {
            white: {
                total: whitePawns,
                doubled: whiteDoubledPawns,
                isolated: whiteIsolatedPawns
            },
            black: {
                total: blackPawns,
                doubled: blackDoubledPawns,
                isolated: blackIsolatedPawns
            }
        };
    };

    const getCenterControl = (game: Chess) => {
        // Analyze center control (e4, d4, e5, d5)
        const centerSquares = ['e4', 'd4', 'e5', 'd5'];
        let whiteCenterControl = 0;
        let blackCenterControl = 0;

        centerSquares.forEach(square => {
            const piece = game.get(square as Square);
            if (piece) {
                if (piece.color === 'w') {
                    whiteCenterControl += 1;
                } else {
                    blackCenterControl += 1;
                }
            }

            // Count attacking pieces
            const attacks = game.moves({ square: square as Square, verbose: true });
            attacks.forEach(attack => {
                const attackingPiece = game.get(attack.from as Square);
                if (attackingPiece) {
                    if (attackingPiece.color === 'w') {
                        whiteCenterControl += 0.5;
                    } else {
                        blackCenterControl += 0.5;
                    }
                }
            });
        });

        return {
            white: whiteCenterControl,
            black: blackCenterControl
        };
    };

    const getPieceCoordination = (game: Chess) => {
        // Analyze piece coordination based on piece mobility and connections
        let whiteCoordination = 0;
        let blackCoordination = 0;

        // Iterate through all squares on the board
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = game.get(`${String.fromCharCode(97 + file)}${8 - rank}` as Square);
                if (piece) {
                    const square = `${String.fromCharCode(97 + file)}${8 - rank}`;
                    const moves = game.moves({ square: square as Square, verbose: true });
                    const mobility = moves.length;

                    // Simple coordination metric based on piece type and mobility
                    let coordinationValue = 0;
                    switch (piece.type) {
                        case 'q': coordinationValue = mobility * 0.8; break;
                        case 'r': coordinationValue = mobility * 0.7; break;
                        case 'b': coordinationValue = mobility * 0.6; break;
                        case 'n': coordinationValue = mobility * 0.5; break;
                        case 'p': coordinationValue = mobility * 0.3; break;
                        default: coordinationValue = mobility * 0.4;
                    }

                    if (piece.color === 'w') {
                        whiteCoordination += coordinationValue;
                    } else {
                        blackCoordination += coordinationValue;
                    }
                }
            }
        }

        return {
            white: whiteCoordination,
            black: blackCoordination
        };
    };

    const getTacticalPatterns = (game: Chess) => {
        // Simple tactical pattern detection
        const moves = game.moves({ verbose: true });
        let forks = 0;
        const pins = 0;
        const skewers = 0;

        // This is a simplified tactical detection
        // In a real implementation, this would be much more complex
        moves.forEach(move => {
            // Check if move captures a piece
            const target = game.get(move.to as Square);
            if (target) {
                // Simple fork detection (attacking multiple pieces)
                const attacks = game.moves({ square: move.from as Square, verbose: true });
                if (attacks.length > 2) forks += 1;
            }
        });

        return {
            forks,
            pins,
            skewers
        };
    };

    // Get move quality assessment
    const getMoveQuality = (game: Chess, move: { from: string; to: string; piece: string }) => {
        // Simple move quality assessment based on piece value and position
        const pieceValue = getPieceValue(move.piece.toLowerCase());
        const targetSquare = game.get(move.to as Square);
        const targetValue = targetSquare ? getPieceValue(targetSquare.type) : 0;

        // Material gain
        if (targetValue > 0) {
            if (targetValue > pieceValue) return 'excellent'; // Winning material
            if (targetValue === pieceValue) return 'good'; // Equal exchange
            return 'acceptable'; // Giving up material
        }

        // Piece development
        if (['n', 'b'].includes(move.piece.toLowerCase())) {
            // Developing minor pieces
            const fromRow = 8 - parseInt(move.from[1]);
            const toRow = 8 - parseInt(move.to[1]);
            if (move.piece === 'n' && Math.abs(fromRow - toRow) >= 2) return 'good'; // Knight leaping
            if (move.piece === 'b' && Math.abs(fromRow - toRow) >= 2) return 'good'; // Bishop developing
        }

        // Pawn moves
        if (move.piece.toLowerCase() === 'p') {
            // Center control
            if (['e4', 'd4', 'e5', 'd5'].includes(move.to)) return 'good';
            // Pawn advancing
            const fromRow = parseInt(move.from[1]);
            const toRow = parseInt(move.to[1]);
            if (Math.abs(toRow - fromRow) >= 2) return 'acceptable'; // Pawn leap
        }

        return 'normal';
    };

    // Get strategic context
    const getStrategicContext = (game: Chess) => {
        const analysis = analyzePosition(game);
        const phase = getGamePhase(analysis.materialCount);
        const initiative = getInitiative(analysis);
        const threats = getThreats(game);

        return {
            phase,
            initiative,
            threats,
            ...analysis
        };
    };

    const getThreats = (game: Chess) => {
        // Simple threat detection
        const moves = game.moves({ verbose: true });
        const threats: string[] = [];

        moves.forEach(move => {
            const target = game.get(move.to as Square);
            if (target && target.type === 'q') {
                threats.push(`Threatening the ${target.color === 'w' ? 'white' : 'black'} queen on ${move.to}`);
            } else if (target && target.type === 'k') {
                threats.push(`Attacking the ${target.color === 'w' ? 'white' : 'black'} king on ${move.to}`);
            }
        });

        return threats;
    };

    const getGamePhase = (materialCount: { white: number; black: number; diff: number }) => {
        const totalMaterial = materialCount.white + materialCount.black;
        if (totalMaterial > 60) return 'opening';
        if (totalMaterial > 30) return 'middlegame';
        return 'endgame';
    };

    const getInitiative = (analysis: ReturnType<typeof analyzePosition>) => {
        // Simple initiative assessment
        if (analysis.isCheck) return 'attacking';
        if (Math.abs(analysis.materialCount.diff) > 3) return 'material_advantage';
        if (analysis.pawnStructure.white.isolated < analysis.pawnStructure.black.isolated) return 'positional_advantage';
        if (analysis.pawnStructure.black.isolated < analysis.pawnStructure.white.isolated) return 'positional_advantage';
        return 'balanced';
    };

    // Piece names mapping
    const pieceNames: Record<string, string> = {
        'p': 'pawn',
        'n': 'knight',
        'b': 'bishop',
        'r': 'rook',
        'q': 'queen',
        'k': 'king'
    };

    // Square names mapping (from algebraic notation to descriptive names)
    const squareNames: Record<string, string> = {
        'a1': 'A1', 'b1': 'B1', 'c1': 'C1', 'd1': 'D1', 'e1': 'E1', 'f1': 'F1', 'g1': 'G1', 'h1': 'H1',
        'a2': 'A2', 'b2': 'B2', 'c2': 'C2', 'd2': 'D2', 'e2': 'E2', 'f2': 'F2', 'g2': 'G2', 'h2': 'H2',
        'a3': 'A3', 'b3': 'B3', 'c3': 'C3', 'd3': 'D3', 'e3': 'E3', 'f3': 'F3', 'g3': 'G3', 'h3': 'H3',
        'a4': 'A4', 'b4': 'B4', 'c4': 'C4', 'd4': 'D4', 'e4': 'E4', 'f4': 'F4', 'g4': 'G4', 'h4': 'H4',
        'a5': 'A5', 'b5': 'B5', 'c5': 'C5', 'd5': 'D5', 'e5': 'E5', 'f5': 'F5', 'g5': 'G5', 'h5': 'H5',
        'a6': 'A6', 'b6': 'B6', 'c6': 'C6', 'd6': 'D6', 'e6': 'E6', 'f6': 'F6', 'g6': 'G6', 'h6': 'H6',
        'a7': 'A7', 'b7': 'B7', 'c7': 'C7', 'd7': 'D7', 'e7': 'E7', 'f7': 'F7', 'g7': 'G7', 'h7': 'H7',
        'a8': 'A8', 'b8': 'B8', 'c8': 'C8', 'd8': 'D8', 'e8': 'E8', 'f8': 'F8', 'g8': 'G8', 'h8': 'H8'
    };

    // Generate comment for player's move
    const generatePlayerMoveComment = (move: { from: string; to: string; piece: string }): string => {
        const pieceName = pieceNames[move.piece.toLowerCase()] || move.piece;
        const toSquare = squareNames[move.to] || move.to;

        // Analyze the position
        const game = new Chess(chessGameRef.current.fen());
        const analysis = getStrategicContext(game);
        const moveQuality = getMoveQuality(game, move);

        // Strategic templates based on game phase and move quality
        let templates: string[] = [];

        if (analysis.phase === 'opening') {
            if (moveQuality === 'excellent') {
                templates = [
                    `Excellent opening move! Developing your ${pieceName} to ${toSquare} controls the center.`,
                    `Great choice! Your ${pieceName} on ${toSquare} is perfectly placed for the opening.`,
                    `Superb opening play! That ${pieceName} move to ${toSquare} follows opening principles.`,
                    `Outstanding! Your ${pieceName} on ${toSquare} helps control the center and develop your position.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `Good opening move with your ${pieceName} to ${toSquare}.`,
                    `Nice development! Your ${pieceName} on ${toSquare} is active.`,
                    `Solid opening choice. The ${pieceName} on ${toSquare} supports your position.`,
                    `Well played! Your ${pieceName} to ${toSquare} contributes to your opening setup.`
                ];
            } else {
                templates = [
                    `You moved your ${pieceName} to ${toSquare}. Consider piece development in the opening.`,
                    `Your ${pieceName} is now on ${toSquare}. In the opening, focus on developing pieces.`,
                    `${pieceName} to ${toSquare}. Remember to control the center in the opening.`,
                    `You've moved your ${pieceName} to ${toSquare}. Try to develop your pieces toward the center.`
                ];
            }
        } else if (analysis.phase === 'middlegame') {
            if (moveQuality === 'excellent') {
                templates = [
                    `Excellent middlegame move! Your ${pieceName} on ${toSquare} creates strong threats.`,
                    `Brilliant! That ${pieceName} move to ${toSquare} puts real pressure on your opponent.`,
                    `Fantastic middlegame play! Your ${pieceName} on ${toSquare} dominates the position.`,
                    `Impressive tactics! Your ${pieceName} on ${toSquare} creates multiple threats.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `Strong middlegame move with your ${pieceName} to ${toSquare}.`,
                    `Good choice! Your ${pieceName} on ${toSquare} improves your position.`,
                    `Solid middlegame play. The ${pieceName} on ${toSquare} is well-placed.`,
                    `Nice move! Your ${pieceName} on ${toSquare} increases your piece coordination.`
                ];
            } else {
                templates = [
                    `You moved your ${pieceName} to ${toSquare}. Look for tactical opportunities in the middlegame.`,
                    `Your ${pieceName} is now on ${toSquare}. Consider coordinating your pieces better.`,
                    `${pieceName} to ${toSquare}. In the middlegame, piece coordination is key.`,
                    `You've moved your ${pieceName} to ${toSquare}. Try to create threats or improve your position.`
                ];
            }
        } else { // endgame
            if (moveQuality === 'excellent') {
                templates = [
                    `Excellent endgame technique! Your ${pieceName} on ${toSquare} advances your winning plan.`,
                    `Superb endgame move! That ${pieceName} to ${toSquare} improves your position significantly.`,
                    `Brilliant endgame play! Your ${pieceName} on ${toSquare} brings you closer to victory.`,
                    `Masterful endgame! Your ${pieceName} on ${toSquare} creates a winning advantage.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `Good endgame move with your ${pieceName} to ${toSquare}.`,
                    `Nice technique! Your ${pieceName} on ${toSquare} supports your endgame plan.`,
                    `Solid endgame play. The ${pieceName} on ${toSquare} is actively placed.`,
                    `Well played! Your ${pieceName} on ${toSquare} improves your king safety.`
                ];
            } else {
                templates = [
                    `You moved your ${pieceName} to ${toSquare}. In the endgame, every move counts.`,
                    `Your ${pieceName} is now on ${toSquare}. Activate your pieces in the endgame.`,
                    `${pieceName} to ${toSquare}. Simplification is often key in the endgame.`,
                    `You've moved your ${pieceName} to ${toSquare}. Try to improve your pawn structure.`
                ];
            }
        }

        // Add situation-dependent comments
        if (analysis.isCheck) {
            templates.push(
                `You're in check! Your ${pieceName} move to ${toSquare} was necessary for king safety.`,
                `Good defense! Moving your ${pieceName} to ${toSquare} gets you out of check.`,
                `Well played! Your ${pieceName} to ${toSquare} defends against the check.`
            );
        }

        if (Math.abs(analysis.materialCount.diff) > 2) {
            templates.push(
                `You have a material advantage. Your ${pieceName} on ${toSquare} reinforces your lead.`,
                `Good move! With your material advantage, your ${pieceName} on ${toSquare} increases the pressure.`,
                `Excellent! Your ${pieceName} on ${toSquare} helps maintain your material advantage.`
            );
        }

        // Add center control comments
        if (analysis.centerControl.white > analysis.centerControl.black && playerSide === 'white') {
            templates.push(
                `Great center control! Your ${pieceName} on ${toSquare} helps dominate the center.`,
                `Well done! Your ${pieceName} on ${toSquare} strengthens your central presence.`
            );
        } else if (analysis.centerControl.black > analysis.centerControl.white && playerSide === 'black') {
            templates.push(
                `Great center control! Your ${pieceName} on ${toSquare} helps dominate the center.`,
                `Well done! Your ${pieceName} on ${toSquare} strengthens your central presence.`
            );
        }

        // Add tactical pattern comments
        if (analysis.tacticalPatterns.forks > 0) {
            templates.push(
                `Nice fork! Your ${pieceName} on ${toSquare} attacks multiple pieces.`,
                `Good tactics! Your ${pieceName} on ${toSquare} creates a fork.`
            );
        }

        // Add threat comments
        if (analysis.threats.length > 0) {
            templates.push(
                `Be careful! ${analysis.threats[0]}`,
                `Watch out! ${analysis.threats[0]}`
            );
        }

        // Return a random template
        return templates[Math.floor(Math.random() * templates.length)];
    };

    // Generate comment for AI's move
    const generateAIMoveComment = (move: { from: string; to: string; piece: string }): string => {
        const pieceName = pieceNames[move.piece.toLowerCase()] || move.piece;
        const toSquare = squareNames[move.to] || move.to;

        // Analyze the position
        const game = new Chess(chessGameRef.current.fen());
        const analysis = getStrategicContext(game);
        const moveQuality = getMoveQuality(game, move);

        // Strategic templates based on game phase and move quality
        let templates: string[] = [];

        if (analysis.phase === 'opening') {
            if (moveQuality === 'excellent') {
                templates = [
                    `I've played an excellent opening move! My ${pieceName} to ${toSquare} controls the center.`,
                    `Great opening choice! My ${pieceName} on ${toSquare} follows sound principles.`,
                    `Superb opening play! That ${pieceName} move to ${toSquare} puts pressure on you.`,
                    `Outstanding! My ${pieceName} on ${toSquare} helps control the center and develop my position.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `I've developed my ${pieceName} to ${toSquare} in the opening.`,
                    `Good opening move with my ${pieceName} to ${toSquare}.`,
                    `Solid choice. My ${pieceName} on ${toSquare} supports my position.`,
                    `Well played! My ${pieceName} to ${toSquare} contributes to my opening setup.`
                ];
            } else {
                templates = [
                    `I moved my ${pieceName} to ${toSquare}. Developing pieces is key in the opening.`,
                    `My ${pieceName} is now on ${toSquare}. I'm focusing on piece development.`,
                    `${pieceName} to ${toSquare}. I'm aiming for central control.`,
                    `I've moved my ${pieceName} to ${toSquare}. Try to develop my pieces toward the center.`
                ];
            }
        } else if (analysis.phase === 'middlegame') {
            if (moveQuality === 'excellent') {
                templates = [
                    `Excellent middlegame move! My ${pieceName} on ${toSquare} creates strong threats.`,
                    `Brilliant! That ${pieceName} move to ${toSquare} puts real pressure on your position.`,
                    `Fantastic middlegame play! My ${pieceName} on ${toSquare} dominates the board.`,
                    `Impressive tactics! My ${pieceName} on ${toSquare} creates multiple threats.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `Strong middlegame move with my ${pieceName} to ${toSquare}.`,
                    `Good choice! My ${pieceName} on ${toSquare} improves my position.`,
                    `Solid middlegame play. The ${pieceName} on ${toSquare} is well-placed.`,
                    `Nice move! My ${pieceName} on ${toSquare} increases my piece coordination.`
                ];
            } else {
                templates = [
                    `I moved my ${pieceName} to ${toSquare}. Looking for tactical opportunities.`,
                    `My ${pieceName} is now on ${toSquare}. Coordinating my pieces effectively.`,
                    `${pieceName} to ${toSquare}. Piece coordination is key in the middlegame.`,
                    `I've moved my ${pieceName} to ${toSquare}. Try to create threats or improve my position.`
                ];
            }
        } else { // endgame
            if (moveQuality === 'excellent') {
                templates = [
                    `Excellent endgame technique! My ${pieceName} on ${toSquare} advances my winning plan.`,
                    `Superb endgame move! That ${pieceName} to ${toSquare} improves my position significantly.`,
                    `Brilliant endgame play! My ${pieceName} on ${toSquare} brings me closer to victory.`,
                    `Masterful endgame! My ${pieceName} on ${toSquare} creates a winning advantage.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `Good endgame move with my ${pieceName} to ${toSquare}.`,
                    `Nice technique! My ${pieceName} on ${toSquare} supports my endgame plan.`,
                    `Solid endgame play. The ${pieceName} on ${toSquare} is actively placed.`,
                    `Well played! My ${pieceName} on ${toSquare} improves my king safety.`
                ];
            } else {
                templates = [
                    `I moved my ${pieceName} to ${toSquare}. In the endgame, every move counts.`,
                    `My ${pieceName} is now on ${toSquare}. Activating my pieces in the endgame.`,
                    `${pieceName} to ${toSquare}. Simplification is often key in the endgame.`,
                    `I've moved my ${pieceName} to ${toSquare}. Try to improve my pawn structure.`
                ];
            }
        }

        // Add situation-dependent comments
        if (analysis.isCheck) {
            templates.push(
                `Check! My ${pieceName} move to ${toSquare} puts your king under pressure.`,
                `Good attack! Moving my ${pieceName} to ${toSquare} forces your king to move.`,
                `Well played! My ${pieceName} to ${toSquare} attacks your king.`
            );
        }

        if (Math.abs(analysis.materialCount.diff) > 2) {
            const hasMaterialAdvantage = analysis.materialCount.diff > 0 ?
                (chessGameRef.current.turn() === 'w' ? 'White' : 'Black') :
                (chessGameRef.current.turn() === 'w' ? 'Black' : 'White');

            if ((playerSide === 'white' && hasMaterialAdvantage === 'White') ||
                (playerSide === 'black' && hasMaterialAdvantage === 'Black')) {
                templates.push(
                    `I'm down in material, but my ${pieceName} on ${toSquare} keeps fighting.`,
                    `Despite your material advantage, my ${pieceName} on ${toSquare} creates counterplay.`,
                    `I'm trying to complicate the position with my ${pieceName} on ${toSquare}.`
                );
            } else {
                templates.push(
                    `My material advantage grows! The ${pieceName} on ${toSquare} reinforces my lead.`,
                    `Good move! With my material advantage, my ${pieceName} on ${toSquare} increases the pressure.`,
                    `Excellent! My ${pieceName} on ${toSquare} helps maintain my material advantage.`
                );
            }
        }

        // Add center control comments
        if (analysis.centerControl.white > analysis.centerControl.black && playerSide === 'black') {
            templates.push(
                `Great center control! My ${pieceName} on ${toSquare} helps dominate the center.`,
                `Well done! My ${pieceName} on ${toSquare} strengthens my central presence.`
            );
        } else if (analysis.centerControl.black > analysis.centerControl.white && playerSide === 'white') {
            templates.push(
                `Great center control! My ${pieceName} on ${toSquare} helps dominate the center.`,
                `Well done! My ${pieceName} on ${toSquare} strengthens my central presence.`
            );
        }

        // Add tactical pattern comments
        if (analysis.tacticalPatterns.forks > 0) {
            templates.push(
                `Nice fork! My ${pieceName} on ${toSquare} attacks multiple pieces.`,
                `Good tactics! My ${pieceName} on ${toSquare} creates a fork.`
            );
        }

        // Add threat comments
        if (analysis.threats.length > 0) {
            templates.push(
                `Be careful! ${analysis.threats[0]}`,
                `Watch out! ${analysis.threats[0]}`
            );
        }

        // Return a random template
        return templates[Math.floor(Math.random() * templates.length)];
    };

    // Generate comment for hint
    const generateHintComment = (move: { from: string; to: string; piece: string }): string => {
        const pieceName = pieceNames[move.piece.toLowerCase()] || move.piece;
        const toSquare = squareNames[move.to] || move.to;

        // Analyze the position
        const game = new Chess(chessGameRef.current.fen());
        const analysis = getStrategicContext(game);
        const moveQuality = getMoveQuality(game, move);

        // Strategic templates based on game phase and move quality
        let templates: string[] = [];

        if (analysis.phase === 'opening') {
            if (moveQuality === 'excellent') {
                templates = [
                    `Consider this excellent opening move! Moving your ${pieceName} to ${toSquare} controls the center.`,
                    `Here's a great opening idea! Your ${pieceName} on ${toSquare} would follow sound principles.`,
                    `Superb opening suggestion! That ${pieceName} move to ${toSquare} puts pressure on your opponent.`,
                    `Outstanding! Your ${pieceName} on ${toSquare} would help control the center and develop your position.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `A good opening move would be to develop your ${pieceName} to ${toSquare}.`,
                    `Consider moving your ${pieceName} to ${toSquare} in the opening.`,
                    `Solid choice. Your ${pieceName} on ${toSquare} would support your position.`,
                    `Well played! Your ${pieceName} to ${toSquare} would contribute to your opening setup.`
                ];
            } else {
                templates = [
                    `You could move your ${pieceName} to ${toSquare}. Focus on piece development in the opening.`,
                    `Your ${pieceName} to ${toSquare} would be a decent opening move.`,
                    `Consider ${pieceName} to ${toSquare}. Control the center in the opening.`,
                    `You could move your ${pieceName} to ${toSquare}. Try to develop your pieces toward the center.`
                ];
            }
        } else if (analysis.phase === 'middlegame') {
            if (moveQuality === 'excellent') {
                templates = [
                    `Excellent middlegame idea! Your ${pieceName} on ${toSquare} would create strong threats.`,
                    `Brilliant suggestion! That ${pieceName} move to ${toSquare} would put real pressure on your opponent.`,
                    `Fantastic middlegame plan! Your ${pieceName} on ${toSquare} would dominate the board.`,
                    `Impressive tactics! Your ${pieceName} on ${toSquare} would create multiple threats.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `A strong middlegame move would be to place your ${pieceName} on ${toSquare}.`,
                    `Good choice! Your ${pieceName} on ${toSquare} would improve your position.`,
                    `Solid middlegame play. The ${pieceName} on ${toSquare} would be well-placed.`,
                    `Nice move! Your ${pieceName} on ${toSquare} would increase your piece coordination.`
                ];
            } else {
                templates = [
                    `You could move your ${pieceName} to ${toSquare}. Look for tactical opportunities.`,
                    `Your ${pieceName} on ${toSquare} would be a decent middlegame move.`,
                    `Consider ${pieceName} to ${toSquare}. Coordinate your pieces effectively.`,
                    `You could move your ${pieceName} to ${toSquare}. Try to create threats or improve your position.`
                ];
            }
        } else { // endgame
            if (moveQuality === 'excellent') {
                templates = [
                    `Excellent endgame technique! Your ${pieceName} on ${toSquare} would advance your winning plan.`,
                    `Superb endgame suggestion! That ${pieceName} to ${toSquare} would improve your position significantly.`,
                    `Brilliant endgame idea! Your ${pieceName} on ${toSquare} would bring you closer to victory.`,
                    `Masterful endgame! Your ${pieceName} on ${toSquare} would create a winning advantage.`
                ];
            } else if (moveQuality === 'good') {
                templates = [
                    `A good endgame move would be to place your ${pieceName} on ${toSquare}.`,
                    `Nice technique! Your ${pieceName} on ${toSquare} would support your endgame plan.`,
                    `Solid endgame play. The ${pieceName} on ${toSquare} would be actively placed.`,
                    `Well played! Your ${pieceName} on ${toSquare} would improve your king safety.`
                ];
            } else {
                templates = [
                    `You could move your ${pieceName} to ${toSquare}. In the endgame, every move counts.`,
                    `Your ${pieceName} on ${toSquare} would be a decent endgame move.`,
                    `Consider ${pieceName} to ${toSquare}. Simplification is often key in the endgame.`,
                    `You could move your ${pieceName} to ${toSquare}. Try to improve your pawn structure.`
                ];
            }
        }

        // Add situation-dependent comments
        if (analysis.isCheck) {
            templates.push(
                `You're in check! Consider moving your ${pieceName} to ${toSquare} for king safety.`,
                `To get out of check, moving your ${pieceName} to ${toSquare} would be a good idea.`,
                `Well played! Moving your ${pieceName} to ${toSquare} would defend against the check.`
            );
        }

        if (Math.abs(analysis.materialCount.diff) > 2) {
            const hasMaterialAdvantage = analysis.materialCount.diff > 0 ?
                (chessGameRef.current.turn() === 'w' ? 'Black' : 'White') :
                (chessGameRef.current.turn() === 'w' ? 'White' : 'Black');

            if ((playerSide === 'white' && hasMaterialAdvantage === 'White') ||
                (playerSide === 'black' && hasMaterialAdvantage === 'Black')) {
                templates.push(
                    `With your material advantage, moving your ${pieceName} to ${toSquare} increases pressure.`,
                    `Your material advantage makes ${pieceName} to ${toSquare} a strong choice.`,
                    `Excellent! Your ${pieceName} on ${toSquare} would help maintain your material advantage.`
                );
            } else {
                templates.push(
                    `Despite being down in material, ${pieceName} to ${toSquare} creates counterplay.`,
                    `To fight back, moving your ${pieceName} to ${toSquare} is a good defensive idea.`,
                    `You're trying to complicate the position with ${pieceName} to ${toSquare}.`
                );
            }
        }

        // Add center control comments
        if (analysis.centerControl.white > analysis.centerControl.black && playerSide === 'white') {
            templates.push(
                `Great center control! Your ${pieceName} on ${toSquare} would help dominate the center.`,
                `Well done! Your ${pieceName} on ${toSquare} would strengthen your central presence.`
            );
        } else if (analysis.centerControl.black > analysis.centerControl.white && playerSide === 'black') {
            templates.push(
                `Great center control! Your ${pieceName} on ${toSquare} would help dominate the center.`,
                `Well done! Your ${pieceName} on ${toSquare} would strengthen your central presence.`
            );
        }

        // Add tactical pattern comments
        if (analysis.tacticalPatterns.forks > 0) {
            templates.push(
                `Nice fork! Your ${pieceName} on ${toSquare} would attack multiple pieces.`,
                `Good tactics! Your ${pieceName} on ${toSquare} would create a fork.`
            );
        }

        // Add threat comments
        if (analysis.threats.length > 0) {
            templates.push(
                `Be careful! ${analysis.threats[0]}`,
                `Watch out! ${analysis.threats[0]}`
            );
        }

        // Return a random template
        return templates[Math.floor(Math.random() * templates.length)];
    };

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
                        const piece = chessGameRef.current.get(move.from as Square);
                        const result = makeMove(chessPosition, move.from, move.to);
                        if (result) {
                            const [newFen] = result;
                            chessGameRef.current.load(newFen as string);
                            setChessPosition(newFen as string);
                            setCurrentPlayer(chessGameRef.current.turn() === 'w' ? 'white' : 'black');

                            // Track AI move and generate comment
                            if (piece) {
                                const aiMove = {
                                    from: move.from,
                                    to: move.to,
                                    piece: piece.type
                                };
                                setMoveComment(generateAIMoveComment(aiMove));
                            }

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
                const piece = chessGameRef.current.get(move.from as Square);

                // Highlight the suggested move
                setOptionSquares({
                    [move.from]: {
                        background: 'rgba(255, 255, 0, 0.4)'
                    },
                    [move.to]: {
                        background: 'rgba(255, 0, 0, 0.4)'
                    }
                });

                // Generate and set hint comment
                if (piece) {
                    const hintMove = {
                        from: move.from,
                        to: move.to,
                        piece: piece.type
                    };
                    setMoveComment(generateHintComment(hintMove));
                }
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
        const piece = chessGameRef.current.get(moveFrom as Square);
        try {
            chessGameRef.current.move({
                from: moveFrom,
                to: args.square,
                promotion: 'q'
            });

            // Track player move and generate comment
            if (piece) {
                const playerMove = {
                    from: moveFrom,
                    to: args.square,
                    piece: piece.type
                };
                setMoveComment(generatePlayerMoveComment(playerMove));
            }
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
            const piece = chessGameRef.current.get(args.sourceSquare as Square);
            const result = makeMove(chessPosition, args.sourceSquare, args.targetSquare);

            // If move was successful
            if (result) {
                const [newFen] = result;
                chessGameRef.current.load(newFen as string);
                // Update the position state upon successful move to trigger a re-render of the chessboard
                setChessPosition(newFen as string);
                setCurrentPlayer(chessGameRef.current.turn() === 'w' ? 'white' : 'black');

                // Track player move and generate comment
                if (piece) {
                    const playerMove = {
                        from: args.sourceSquare,
                        to: args.targetSquare,
                        piece: piece.type
                    };
                    setMoveComment(generatePlayerMoveComment(playerMove));
                }

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
                    {moveComment && (
                        <div className="coach-container">
                            <div className="coach-image">
                                <div className="coach-icon">👨‍🏫</div>
                            </div>
                            <div className="coach-comment">
                                <div className="move-comment">
                                    {moveComment}
                                </div>
                            </div>
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
