import Matter from 'matter-js/build/matter.min.js';
import {Ray} from "./ray.js";
import {Corner} from './geometry.js'

class RaySource {

    constructor(x, y, walls, segments, endpoints, shaderProgram){
        this.pos = Matter.Vector.create(x, y);  // ray source point
        this.rays = []; // all the rays
        this.cornerRays = []; // auxilary rays
        this.hangRay = new Ray(this.pos,0,Matter.Vector.create(0,0)); // for visual of hanging from the ceiling
        this.hangRay.setDir(Matter.Vector.create(0,-1)); // point upwards
        this.endpoints = endpoints; // all terrain vertices
        this.segments = segments; // all terrain line segments
        this.tris = [];
        this.shaderProgram = shaderProgram;
        this.color = [0.933, 0.867, 0.51,
                      0.933, 0.867, 0.51,
                      0.933, 0.867, 0.51,]

        // init all main rays
        for ( let endpoint of endpoints ) {
            let rayDir = Matter.Vector.create(endpoint.x - this.pos.x, endpoint.y - this.pos.y);
            Matter.Vector.normalise(rayDir);
            let newRay = new Ray(this.pos, 0, endpoint);
            newRay.setDir(rayDir);
            
            this.rays.push(newRay);
        }
        this.uniforms = {
            dimensions:    [window.innerWidth, window.innerHeight],
            position: [this.pos.x, this.pos.y] 
          };
                
        this.shader = new PIXI.Shader.from(shaderProgram.vert, shaderProgram.frag, this.uniforms);
    }
    
    // compare 2 rays by angle
    compare(a,b) {
        const angleA = a.angle;
        const angleB = b.angle;
    
        return angleA - angleB;
    }

    // for moving light
    update(x,y) {
        this.pos.x = x;
        this.pos.y = y;

        this.rays = [];   

        this.uniforms = {
            dimensions:    [window.innerWidth, window.innerHeight],
            position: [x, y] 
          };

        this.shader = new PIXI.Shader.from(this.shaderProgram.vert, this.shaderProgram.frag, this.uniforms);
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

    look() {
        for ( let ray of this.rays) {
            this.cast(ray);
        }
    }

    cast(ray) {
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

    auxLook() {
        for ( let ray of this.cornerRays) {
           ray = this.auxCast(ray);
           this.rays.push(ray);
        }     
        this.rays.sort(this.compare);
    }

    auxCast(ray) {
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

    show(graphics) {
        // Circle
        graphics.lineStyle(1, 0xDE3249); // draw a circle, set the lineStyle to zero so the circle doesn't have an outline
        graphics.beginFill(0xFEEB77, 1);
        graphics.drawCircle(this.pos.x, this.pos.y, 10);
        graphics.endFill();
    }

    drawLight(graphics){
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

    // make webgl meshes to draw light, pass shader from constructor
    drawMesh(filters) {
        this.tris = [];
        // draw a triangle beween the endpoints & source of every ray
        for ( let i = 1; i < this.rays.length; i++) {
            const triangle = new PIXI.Geometry()
                .addAttribute('aVertexPosition', 
                        [ this.pos.x,  this.pos.y,
                          this.rays[i-1].closestPoint.x, this.rays[i-1].closestPoint.y,
                          this.rays[i].closestPoint.x, this.rays[i].closestPoint.y],
                        2)
                .addAttribute('aColor', 
                        this.color, 
                        3);
            const triMesh = new PIXI.Mesh(triangle, this.shader);
            triMesh.filters = filters;
            this.tris.push(triMesh);
        }
        // draw an extra triangle to connect the beginning and end of the array
        const firstTri = new PIXI.Geometry()
        .addAttribute('aVertexPosition', 
        [this.pos.x,  this.pos.y,
            this.rays[0].closestPoint.x, this.rays[0].closestPoint.y,
            this.rays[this.rays.length-1].closestPoint.x, 
            this.rays[this.rays.length-1].closestPoint.y],
            2)
        .addAttribute('aColor', 
            this.color, 
            3);
        const firstTriMesh = new PIXI.Mesh(firstTri, this.shader);
        firstTriMesh.filters = filters;
        this.tris.push(firstTriMesh);
    }
}

export { RaySource }

