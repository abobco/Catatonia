import Matter from 'matter-js/build/matter.min.js';

let Vector = Matter.Vector;
/**
 * - Holds position & direction for single ray
 * - Performs ray - line segment intersection tests
 */
export class Ray {
    /**
     * @param {Matter.Vector} pos - source position
     * @param {Matter.Vector} anglePoint - terrain vertex to be casted at
     */
    constructor(pos, anglePoint) {
        this.pos = pos;
        this.dir = Vector.create(1,0);

        this.crossResult;
        this.angle;

        this.anglePoint = anglePoint;
        this.endpoint = anglePoint.pos;
        this.closestPoint = anglePoint;
    }

    setDir(dirVector) {
        this.dir = dirVector;
        this.angle = Vector.angle(this.dir, Vector.create(0,0));
    }


    lookAt(x,y) {
        this.dir.x = x - this.pos.x;
        this.dir.y = y - this.pos.y;
        this.dir = Vector.normalise(this.dir)
    }

    /**
     * Performs ray - line segment intersection test
     * @param {Boundary} wall 
     */
    cast(wall) {
        const x1 = wall.a.x,
              y1 = wall.a.y,  
              x2 = wall.b.x,  
              y2 = wall.b.y,  

              x3 = this.pos.x,
              y3 = this.pos.y,
              x4 = this.pos.x + this.dir.x,
              y4 = this.pos.y + this.dir.y;

        const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3-x4);
        if ( den == 0 ) 
            return;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

        if ( t > 0 && t < 1 && u > 0 ) {
            const pt = Vector.create();
            pt.x = x1 + t * ( x2 - x1);
            pt.y = y1 + t * ( y2 - y1);
            return pt;
        }
        else {
            return;
        }
    }
};