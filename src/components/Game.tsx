import React, { useEffect, useState, useRef } from "react";
import supabase from "../lib/supabase";
import { Engine, Actor, Color, Vector, DisplayMode, KeyEvent } from "excalibur";
import { RealtimeChannel } from "@supabase/supabase-js";

interface PlayerState {
  id: string;
  x: number;
  y: number;
}

type GamePresenceState = {
  [key: string]: PlayerState[];
};

function createThrottle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

const Game = () => {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [player, setPlayer] = useState<Actor | null>(null);
  const [otherPlayers, setOtherPlayers] = useState<{ [key: string]: Actor }>({});
  const [playerId, setPlayerId] = useState<string>("");
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const randomId = 'player_' + Math.random().toString(36).substr(2, 9);
    setPlayerId(randomId);
  }, []);

  useEffect(() => {
    const initGame = async () => {
      try {
        if (!playerId || !gameCanvasRef.current) {
          console.log('Cannot initialize game:', { 
            playerId,
            canvas: !!gameCanvasRef.current 
          });
          return;
        }

        // Clean up existing game and channel
        if (engine) {
          engine.stop();
          engine.dispose();
        }
        if (channel) {
          channel.unsubscribe();
        }
        
        console.log('Initializing game for player:', playerId);

        // Initialize the game engine
        const gameEngine = new Engine({
          width: 800,
          height: 600,
          displayMode: DisplayMode.FitScreen,
          canvasElement: gameCanvasRef.current
        });

        // Create the player actor
        const playerActor = new Actor({
          pos: new Vector(400, 300),
          width: 50,
          height: 50,
          color: Color.Red,
        });

        gameEngine.add(playerActor);
        setPlayer(playerActor);
        setEngine(gameEngine);

        
        const presenceChannel = supabase.channel('game')
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState() as GamePresenceState;
            console.log('Presence sync state:', state);
            
            Object.entries(state).forEach(([_, presences]) => {
              const playerState = presences[0] as PlayerState;
              if (!playerState || playerState.id === playerId) return;

              setOtherPlayers(prev => {
                let actor = prev[playerState.id];
                if (!actor) {
                  actor = new Actor({
                    pos: new Vector(playerState.x, playerState.y),
                    width: 50,
                    height: 50,
                    color: Color.Blue,
                  });
                  gameEngine.add(actor);
                } else {
                  actor.pos = new Vector(playerState.x, playerState.y);
                }
                return { ...prev, [playerState.id]: actor };
              });
            });
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            const playerState = newPresences[0] as unknown as PlayerState;
            if (!playerState || playerState.id === playerId) return;

            setOtherPlayers(prev => {
              if (prev[playerState.id]) return prev;
              
              const actor = new Actor({
                pos: new Vector(playerState.x, playerState.y),
                width: 50,
                height: 50,
                color: Color.Blue,
              });
              gameEngine.add(actor);
              return { ...prev, [playerState.id]: actor };
            });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            const playerState = leftPresences[0] as unknown as PlayerState;
            if (!playerState || playerState.id === playerId) return;

            setOtherPlayers(prev => {
              const actor = prev[playerState.id];
              if (actor) {
                gameEngine.remove(actor);
              }
              const { [playerState.id]: removed, ...rest } = prev;
              console.log(removed);
              return rest;
            });
          });

        // Subscribe and track initial position
        await presenceChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              id: playerId,
              x: playerActor.pos.x,
              y: playerActor.pos.y,
            } as PlayerState);
          }
        });

        setChannel(presenceChannel);

        const throttledTrack = createThrottle(async (state: PlayerState) => {
          await presenceChannel.track(state);
        }, 100);

        const keyboardHandler = async (evt: KeyEvent) => {
          if (!playerActor || !presenceChannel) return;
          
          const speed = 5;
          let velocityX = 0;
          let velocityY = 0;

          if (evt.key === "ArrowUp") velocityY = -speed;
          if (evt.key === "ArrowDown") velocityY = speed;
          if (evt.key === "ArrowLeft") velocityX = -speed;
          if (evt.key === "ArrowRight") velocityX = speed;

          if (velocityX !== 0 || velocityY !== 0) {
            playerActor.pos.x += velocityX;
            playerActor.pos.y += velocityY;

            throttledTrack({
              id: playerId,
              x: playerActor.pos.x,
              y: playerActor.pos.y,
            });
          }
        };

        gameEngine.on('preupdate', () => {
          Object.values(otherPlayers).forEach(actor => {
            const targetPos = actor.pos.clone();
            const currentPos = actor.pos;
            const t = 0.3;
            
            actor.pos = new Vector(
              currentPos.x + (targetPos.x - currentPos.x) * t,
              currentPos.y + (targetPos.y - currentPos.y) * t
            );
          });
        });

        gameEngine.input.keyboard.on("hold", keyboardHandler);
        await gameEngine.start();

        return () => {
          console.log('Cleaning up game...');
          gameEngine.input.keyboard.off("hold", keyboardHandler);
          gameEngine.stop();
          gameEngine.dispose();
          presenceChannel.unsubscribe();
          setEngine(null);
          setPlayer(null);
          setChannel(null);
          setOtherPlayers({});
        };
      } catch (error) {
        console.error("Error initializing game:", error);
      }
    };

    initGame();
  }, [playerId]);

  return (
    <div>
      <h1>That Game</h1>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Welcome, Player {playerId}</h2>
      </div>
      <p>Player Position: {player && `${player.pos.x}, ${player.pos.y}`}</p>
      <p>Other Players:</p>
      <ul>
        {Object.entries(otherPlayers).map(([id, actor]) => (
          <li key={id}>Player {id}: {Math.round(actor.pos.x)}, {Math.round(actor.pos.y)}</li>
        ))}
      </ul>
      <div style={{ 
          width: "800px", 
          height: "600px",
          border: "1px solid black",
          backgroundColor: "#f0f0f0",
          position: "relative"
        }}>
        <canvas 
          ref={gameCanvasRef}
          width="800"
          height="600"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

export default Game;
