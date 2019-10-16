import Matter from 'matter-js/build/matter.min.js';
import {Ray} from "./ray.js";
import {Corner} from './geometry.js'

var RaySource = function(x, y, walls, segments, endpoints) {
    this.pos = Matter.Vector.create(x, y);
    this.rays = [];
    this.cornerRays = [];
    this.hangRay = new Ray(this.pos,0,Matter.Vector.create(0,0));
    this.hangRay.setDir(Matter.Vector.create(0,-1));
    this.endpoints = endpoints;
    this.segments = segments;

    for ( let endpoint of endpoints ) {
        let rayDir = Matter.Vector.create(endpoint.x - this.pos.x, endpoint.y - this.pos.y);
        Matter.Vector.normalise(rayDir);
        let newRay = new Ray(this.pos, 0, endpoint);
        newRay.setDir(rayDir);

        this.rays.push(newRay);
    }

    // compare 2 rays by angle
    function compare(a,b) {
        const angleA = a.angle;
        const angleB = b.angle;
    
        return angleA - angleB;
    }
    this.update = function(x,y) {
        this.pos.x = x;
        this.pos.y = y;

        this.rays = [];
        this.cornerRays = [];
        for ( let endpoint of this.endpoints) {
            let rayDir = Matter.Vector.create(endpoint.x - this.pos.x, endpoint.y - this.pos.y);
            Matter.Vector.normalise(rayDir);
            let newRay = new Ray(this.pos, 0, endpoint);
            newRay.setDir(rayDir); 
            this.rays.push(newRay);
        }

        this.look();
        this.auxLook();
    }

    this.look = function() {
        for ( let ray of this.rays) {
            this.cast(ray);
        }
    }

    this.cast = function(ray) {
        let closest = ray.endpoint;
        let record = Math.sqrt(Math.pow(this.pos.x - closest.x,2) + Math.pow(this.pos.y - closest.y,2));
        for ( let wall of this.segments) {              
            const pt = ray.cast(wall);
            if (pt) {
                //const d = p5.Vector.dist(this.pos, pt);
                const d = Math.sqrt(Math.pow(this.pos.x - pt.x,2) + Math.pow(this.pos.y - pt.y,2));
                if ( d < record ) {
                    record = d;
                    closest = pt;
                }                    
            }
        }
        if ( closest ) {
            ray.closestPoint = closest;
            if ( closest == ray.endpoint) {
                let ray1 = new Ray(this.pos, 0, Matter.Vector.create(-5000,0));
                let ray2 = new Ray(this.pos, 0, Matter.Vector.create(-5000,0));
                
                ray1.setDir(Matter.Vector.rotate(ray.dir,-0.005));
                ray2.setDir(Matter.Vector.rotate(ray.dir,0.005));
            
                this.cornerRays.push(ray1, ray2);
            }          
        }
    }

    this.auxLook = function() {
        for ( let ray of this.cornerRays) {
           ray = this.auxCast(ray);
           this.rays.push(ray);
        }     
        this.rays.sort(compare);
    }

    this.auxCast = function(ray) {
        let closest = null
        let record = Infinity;
        for ( let wall of this.segments) {              
            const pt = ray.cast(wall);
            if (pt) {
                //const d = p5.Vector.dist(this.pos, pt);
                const d = Math.sqrt(Math.pow(this.pos.x - pt.x,2) + Math.pow(this.pos.y - pt.y,2));
                if ( d < record ) {
                    record = d;
                    closest = pt;
                }                    
            }
        }
        if ( closest ) {
            ray.closestPoint = closest;
        }
        return ray;
    }

    this.show = function(graphics) {
        // Circle
        graphics.lineStyle(1, 0xDE3249); // draw a circle, set the lineStyle to zero so the circle doesn't have an outline
        graphics.beginFill(0xFEEB77, 1);
        graphics.drawCircle(this.pos.x, this.pos.y, 10);
        graphics.endFill();
    }

    this.drawLight = function(graphics){
        graphics.lineStyle(0);
        graphics.beginFill(0xFEEB77, 0.5);

        graphics.drawPolygon([this.pos.x, this.pos.y,
            this.rays[0].closestPoint.x, this.rays[0].closestPoint.y,
            this.rays[this.rays.length-1].closestPoint.x, 
            this.rays[this.rays.length-1].closestPoint.y]);
            graphics.endFill();

        for ( let i = 1; i < this.rays.length; i++) {
            graphics.beginFill(0xFEEB77, 0.5);
            graphics.drawPolygon([this.pos.x, this.pos.y,
                    this.rays[i-1].closestPoint.x, this.rays[i-1].closestPoint.y,
                    this.rays[i].closestPoint.x, this.rays[i].closestPoint.y]);
            graphics.endFill();
        }
    }
}

RaySource.prototype.constructor = RaySource;
export { RaySource }

