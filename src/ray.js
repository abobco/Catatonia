import Matter from 'matter-js/build/matter.min.js';

var Ray = function(pos, angle, endpoint, isAux = false) {
    
        this.pos = pos;
        //this.dir = p5.Vector.fromAngle(angle);
        this.dir = Matter.Vector.create(1,0);
        this.dir = Matter.Vector.rotateAbout(this.dir, angle, Matter.Vector.create(0,0));

        this.angle = angle;

        this.endpoint = endpoint;
        this.closestPoint = endpoint;
        this.isAux = isAux;

    this.setDir = function(dirVector) {
        this.dir = dirVector;
        this.angle = Matter.Vector.angle(this.dir, Matter.Vector.create(1,0));
    }


    this.lookAt = function(x,y) {
        this.dir.x = x - this.pos.x;
        this.dir.y = y - this.pos.y;
        this.dir = Matter.Vector.normalise(this.dir)
    }

    this.show = function() {
        stroke(127);
        push();
        translate(this.pos.x, this.pos.y);
        line(0, 0, this.dir.x * 10, this.dir.y * 10);
        pop();
    }

    this.cast = function(wall) {
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
            const pt = Matter.Vector.create();
            pt.x = x1 + t * ( x2 - x1);
            pt.y = y1 + t * ( y2 - y1);
            return pt;
        }
        else {
            return;
        }
    }
}

Ray.prototype.constructor = Ray;
export { Ray };