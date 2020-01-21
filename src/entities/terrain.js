/*
    Sets of Colliders for physics collisions and Player action triggers
*/
import Matter from 'matter-js/build/matter.min.js';
import {Corner} from '../lighting/geometry.js';

export class Boundary  {
    constructor(x1,y1,x2,y2, isEdge = false){
        this.a = new Matter.Vector.create(x1,y1);
        this.b = new Matter.Vector.create(x2,y2);
        this.isEdge = isEdge;
    }

}

export class RectSegments{
    constructor(x,y,w,h){
        var A = new Matter.Vector.create(x - (w/2), y - (h/2));
        var B = new Matter.Vector.create(x + (w/2), y - (h/2));
        var C = new Matter.Vector.create(x - (w/2), y + (h/2));
        var D = new Matter.Vector.create(x + (w/2), y + (h/2));
    
        this.bounds = [new Boundary(A.x,A.y, B.x,B.y), 
                       new Boundary(A.x,A.y, C.x,C.y), 
                       new Boundary(C.x,C.y, D.x,D.y), 
                       new Boundary(B.x,B.y, D.x,D.y)]
    }

}

export class Terrain{
    constructor(x,y,w,h){
            // collision rectangle 
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;

        this.A = Matter.Vector.create(x - (w/2), y - (h/2));
        this.B = Matter.Vector.create(x + (w/2), y - (h/2));
        this.C = Matter.Vector.create(x - (w/2), y + (h/2));
        this.D = Matter.Vector.create(x + (w/2), y + (h/2));

        this.bounds = [(new Boundary(this.A.x, this.A.y, this.B.x, this.B.y)), 
                    (new Boundary(this.A.x, this.A.y, this.C.x, this.C.y)), 
                    (new Boundary(this.C.x, this.C.y, this.D.x, this.D.y)), 
                    (new Boundary(this.B.x, this.B.y, this.D.x, this.D.y))];
        
        // For edge raycasting geometry
        this.corners = [new Corner(this.A, this.B, this.C),
                        new Corner(this.B, this.A, this.D),
                        new Corner(this.C, this.A, this.D),
                        new Corner(this.D, this.B, this.C)];

        //this.segments = new RectSegments(x,y,w,h);

        // physics collider
        this.Collider = new Matter.Bodies.rectangle(x,y,w,h,{ isStatic : true });
        this.walkBoxHeight = 20;

        // action trigger colliders
        this.walkBox = new Matter.Bodies.rectangle(x, y - (h/2) - (this.walkBoxHeight/2), 
                                                w, this.walkBoxHeight, 
                                                    { isStatic : true,
                                                      isSensor : true  
                                                    });
        this.walkBox.isEdgeBox = false;
        
        this.edgeBoxWidth = 10;
        this.edgeBoxHeight = 10;
        const edgeBoxOffset = 20;
        this.edgeBoxes = [new Matter.Bodies.rectangle( x + w/2 + this.edgeBoxWidth/2, 
                                                       y - h/2 + edgeBoxOffset, 
                                                       this.edgeBoxWidth,
                                                       this.walkBoxHeight, 
                                                        { 
                                                          isStatic : true,
                                                          isSensor : true,
                                                        }
                                                     ),
                          new Matter.Bodies.rectangle( x - w/2 - this.edgeBoxWidth/2,
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
    
    
    // draw rect given input PIXI Graphics object
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