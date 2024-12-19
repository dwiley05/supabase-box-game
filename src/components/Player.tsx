import { Actor, Collider, CollisionContact, Color, Engine, Input, Side } from 'excalibur';

export class Player extends Actor {
  private speed: number = 200; // pixels per second
  private isJumping: boolean = false;
  private jumpForce: number = 400;
  private gravity: number = 800;

  constructor() {
    super({
      x: 400,
      y: 300,
      width: 50,
      height: 50,
      color: Color.Red,
    });
  }

  onInitialize(engine: Engine): void {
    console.log(engine)
  }

  update(engine: Engine, delta: number): void {
    super.update(engine, delta);
    
    // Handle horizontal movement
    if (engine.input.keyboard.isHeld(Input.Keys.A) || engine.input.keyboard.isHeld(Input.Keys.Left)) {
      this.vel.x = -this.speed;
    } else if (engine.input.keyboard.isHeld(Input.Keys.D) || engine.input.keyboard.isHeld(Input.Keys.Right)) {
      this.vel.x = this.speed;
    } else {
      this.vel.x = 0;
    }

    // Handle jumping
    if ((engine.input.keyboard.wasPressed(Input.Keys.W) || 
         engine.input.keyboard.wasPressed(Input.Keys.Up) ||
         engine.input.keyboard.wasPressed(Input.Keys.Space)) && !this.isJumping) {
      this.vel.y = -this.jumpForce;
      this.isJumping = true;
    }

    // Apply gravity
    this.vel.y += this.gravity * (delta / 1000);

    // Basic ground collision
    if (this.pos.y > 550) {
      this.pos.y = 550;
      this.vel.y = 0;
      this.isJumping = false;
    }
  }

  onCollisionStart(self: Collider, other: Collider, side: Side, contact: CollisionContact): void {
    console.log('Player collided with', other.owner.name);
    console.log('Collision side:', side);
    console.log('Collision contact:', contact);
  }

  attack(): void {
    console.log('Player attacked!');
  }

  takeDamage(amount: number): void {
    console.log(`Player took ${amount} damage!`);
  }
}
