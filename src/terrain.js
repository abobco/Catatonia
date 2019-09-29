/*
    Sets of Colliders for physics collisions and Player action triggers
*/
import Matter from 'matter-js/build/matter.min.js';
var Terrain = function (x, y, w, h) {
    // collision rectangle 
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;

    // physics collider
    this.Collider = new Matter.Bodies.rectangle(x,y,w,h,{ isStatic : true });
    const walkBoxHeight = 20;

    // action trigger colliders
    this.walkBox = new Matter.Bodies.rectangle(x, y - (h/2) - (walkBoxHeight/2), 
                                               w, walkBoxHeight, 
                                                { isStatic : true,
                                                  isSensor : true 
                                                });
    
    // draw rect given input PIXI Graphics object
    this.drawRect = function(graphics) {
        graphics.beginFill(0x6032a8);
        graphics.drawRect( x - (w/2) , y - (h/2) -1, w , h );
        graphics.endFill();

        /*
        // draw walkBox for debug
        graphics.beginFill(0x32a842);
        graphics.drawRect(x - (w/2) , this.walkBox.position.y - (walkBoxHeight/2), w, walkBoxHeight);
        graphics.endFill();
        */
    }
}

Terrain.prototype.constructor = Terrain;
export { Terrain };