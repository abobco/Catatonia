/*
    Sets of Colliders for physics collisions and Player action triggers
*/
import {Vector, Bodies} from 'matter-js/build/matter.min.js';
import {Corner} from '../graphics/lighting/geometry.js';

/** 
 * - Colliders for kinematics 
 * - Line segments for ray casting
 * - Trigger colliders for game events(climbing/walking)
 */
export class Terrain {
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    constructor(x,y,w,h){
        // collision rectangle 
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        this.A = Vector.create(x - (w/2), y - (h/2));
        this.B = Vector.create(x + (w/2), y - (h/2));
        this.C = Vector.create(x - (w/2), y + (h/2));
        this.D = Vector.create(x + (w/2), y + (h/2));

        this.bounds = [(new Boundary(this.A.x, this.A.y, this.B.x, this.B.y)), 
                    (new Boundary(this.A.x, this.A.y, this.C.x, this.C.y)), 
                    (new Boundary(this.C.x, this.C.y, this.D.x, this.D.y)), 
                    (new Boundary(this.B.x, this.B.y, this.D.x, this.D.y))];
        
        // For edge raycasting geometry
        this.corners = [new Corner(this.A, this.B, this.C),
                        new Corner(this.B, this.A, this.D),
                        new Corner(this.C, this.A, this.D),
                        new Corner(this.D, this.B, this.C)];

        // physics collider
        this.Collider = new Bodies.rectangle(x,y,w,h,{ isStatic : true });
        this.walkBoxHeight = 20;

        // action trigger colliders
        this.walkBox = new Bodies.rectangle(x, y - (h/2) - (this.walkBoxHeight/2), 
                                                w, this.walkBoxHeight, 
                                                    { isStatic : true,
                                                      isSensor : true  
                                                    });
        this.walkBox.isEdgeBox = false;
        
        this.edgeBoxWidth = 10;
        this.edgeBoxHeight = 10;
        const edgeBoxOffset = 20;
        this.edgeBoxes = [new Bodies.rectangle( x + w/2 + this.edgeBoxWidth/2, 
                                                       y - h/2 + edgeBoxOffset, 
                                                       this.edgeBoxWidth,
                                                       this.walkBoxHeight, 
                                                        { 
                                                          isStatic : true,
                                                          isSensor : true,
                                                        }
                                                     ),
                          new Bodies.rectangle( x - w/2 - this.edgeBoxWidth/2,
                                                       y - h/2 + edgeBoxOffset, 
                                                       this.edgeBoxWidth, 
                                                       this.walkBoxHeight, 
                                                        { 
                                                          isStatic : true,
                                                          isSensor : true 
                                                        }
                                                     )
                        ];
        this.edgeBoxes[0].isEdgeBox = true;
        this.edgeBoxes[1].isEdgeBox = true;
        this.edgeBoxes[0].isRight = true;
        this.edgeBoxes[1].isRight = false
    } 
    
    /** Draw collision boxes for debugging 
     * @param {PIXI.Graphics} graphics - webgl/canvas renderer
    */
    drawRect(graphics) {
        // draw collision box rectangle
        graphics.beginFill(0x6032a8);
        graphics.drawRect( this.x - (this.w/2) , this.y - (this.h/2) -1, this.w , this.h );
        graphics.endFill();
        
        // draw sensor walkBox for debug
        graphics.beginFill(0x32a842, 0.5);
        graphics.drawRect(this.x - (this.w/2) , this.walkBox.position.y - (this.walkBoxHeight/2), this.w, this.walkBoxHeight);
        graphics.endFill();

        // draw sensor edgeboxes
        for ( let box of this.edgeBoxes) {
            graphics.beginFill(0xfc0303, 0.8);
            graphics.drawRect( box.position.x - (this.edgeBoxWidth/2) , 
                               box.position.y - (this.edgeBoxWidth/2), 
                               this.edgeBoxWidth, 
                               this.edgeBoxHeight);
            graphics.endFill();
        }    
    }
}

/** Line segment for raycasting
 * @class
 */
export class Boundary  {
    /**
     * @param {number} x1 
     * @param {number} y1 
     * @param {number} x2 
     * @param {number} y2 
     * @param {boolean} isEdge 
     */
    constructor(x1,y1,x2,y2, isEdge = false){
        this.a = Vector.create(x1,y1);
        this.b = Vector.create(x2,y2);
        this.isEdge = isEdge;
    }

}

/** Set of 4 line segments from a tile
 * @class
 */
export class RectSegments{
    /**
     * @param {number} x 
     * @param {number} y 
     * @param {number} w 
     * @param {number} h 
     */
    constructor(x,y,w,h){
        var A = Vector.create(x - (w/2), y - (h/2));
        var B = Vector.create(x + (w/2), y - (h/2));
        var C = Vector.create(x - (w/2), y + (h/2));
        var D = Vector.create(x + (w/2), y + (h/2));
    
        this.bounds = [new Boundary(A.x,A.y, B.x,B.y), 
                       new Boundary(A.x,A.y, C.x,C.y), 
                       new Boundary(C.x,C.y, D.x,D.y), 
                       new Boundary(B.x,B.y, D.x,D.y)]
    }

}

// draw walkBox for debug
function drawComponent(graphics, color, rectangle ) { 
    graphics.beginFill(color);
    graphics.drawRect( rectangle.position.x - (rectangle.width/2) , 
                       rectangle.y - (rectangle.height/2), 
                       rectangle.width, 
                       rectangle.height);
    graphics.endFill();
}
export {drawComponent}