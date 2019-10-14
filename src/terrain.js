/*
    Sets of Colliders for physics collisions and Player action triggers
*/
import Matter from 'matter-js/build/matter.min.js';

var Boundary = function(x1,y1,x2,y2, isEdge = false) {
    this.a = new Matter.Vector.create(x1,y1);
    this.b = new Matter.Vector.create(x2,y2);
    this.isEdge = isEdge;
}

Boundary.prototype.constructor = Boundary;
export {Boundary};

var RectSegments = function(x,y,w,h) {
    var A = new Matter.Vector.create(x - (w/2), y - (h/2));
    var B = new Matter.Vector.create(x + (w/2), y - (h/2));
    var C = new Matter.Vector.create(x - (w/2), y + (h/2));
    var D = new Matter.Vector.create(x + (w/2), y + (h/2));

    this.bounds = [new Boundary(A.x,A.y, B.x,B.y), 
                   new Boundary(A.x,A.y, C.x,C.y), 
                   new Boundary(C.x,C.y, D.x,D.y), 
                   new Boundary(B.x,B.y, D.x,D.y)]
}

RectSegments.prototype.constructor = RectSegments;

var Terrain = function (x, y, w, h) {
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

    //this.segments = new RectSegments(x,y,w,h);

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
export { RectSegments };