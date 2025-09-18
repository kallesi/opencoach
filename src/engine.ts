import { Chess } from 'chess.js';
export type Fen = string;
export type ShortMove = { from: string; to: string; };

export const newGame = (): Fen =>
  'rnbqkbnr/pppppppp/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const move = (fen: Fen, from: string, to: string) => {
  const game = new Chess(fen);
  const action = game.move({ from, to, promotion: 'q' });
  return action ? [game.fen(), action] : null;
};