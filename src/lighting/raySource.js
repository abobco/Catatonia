import Matter from 'matter-js/build/matter.min.js';
import {Ray} from "./ray.js";

let Vector = Matter.Vector;
export class RaySource {

    constructor(x, y, segments, endpoints, shaderProgram){
        this.pos = Matter.Vector.create(x, y);  // ray source point
        this.rays = []; // all the rays
        this.cornerRays = []; // auxilary rays
        this.hangRay = new Ray(this.pos, Matter.Vector.create(0,0)); // for visual of hanging from the ceiling
        this.hangRay.setDir(Matter.Vector.create(0,-1)); // point upwards
        this.endpoints = endpoints; // all terrain vertices
        this.segments = segments; // all terrain line segments
        this.tris = [];
        this.mesh;
        this.shaderProgram = shaderProgram;
        this.color = [1, 0.831, 0.322,
                      1, 0.831, 0.322,
                      1, 0.831, 0.322,]
        this.uColor = [1, 0.831, 0.322];

        // init all main rays
        for ( let corner of endpoints ) {
            let endpoint = corner.pos;
            let rayDir = Matter.Vector.create(endpoint.x - this.pos.x, endpoint.y - this.pos.y);
            Matter.Vector.normalise(rayDir);
            let newRay = new Ray(this.pos, corner);
            newRay.setDir(rayDir);
            
            this.rays.push(newRay);
        }
        this.renderer = PIXI.autoDetectRenderer();
        this.uniforms = {
            dimensions:    [window.innerWidth, window.innerHeight],
            // dimensions: [this.renderer.width, this.renderer.height],
            position: [this.pos.x, this.pos.y] ,
            time : Math.random(),
            color : this.uColor
          };
                
        this.shader = new PIXI.Shader.from(shaderProgram.vert, shaderProgram.frag, this.uniforms);
    }
    
    // compare 2 rays by angle
    compare(a,b) {
        return a.angle - b.angle;
    }

    // for moving light
    update(x,y, time) {
        //console.log(time)
        this.pos.x = x;
        this.pos.y = y;

        this.rays = []; 
        if ( time ){
            this.uniforms = {
                dimensions:    [window.innerWidth, window.innerHeight],
                // dimensions: [this.renderer.width, this.renderer.height],
                position: [x, y],
                time: time,
                
              };
        }
        else{
        this.uniforms = {
            dimensions:    [window.innerWidth, window.innerHeight],
            // dimensions: [this.renderer.width, this.renderer.height],
            position: [x, y],
            time: Math.random(),
            color : this.uColor
          };
        }

        this.shader = new PIXI.Shader.from(this.shaderProgram.vert, this.shaderProgram.frag, this.uniforms);
        this.cornerRays = [];

        for ( let corner of this.endpoints) {
            let endpoint = corner.pos;
            let rayDir = Matter.Vector.create(endpoint.x - this.pos.x, endpoint.y - this.pos.y);
            Matter.Vector.normalise(rayDir);
            let newRay = new Ray(this.pos, corner);
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
        let record = Math.pow(this.pos.x - closest.x,2) + Math.pow(this.pos.y - closest.y,2);
        for ( let wall of this.segments) {              
            const pt = ray.cast(wall);
            if (pt) {
                //const d = p5.Vector.dist(this.pos, pt);
                const d = Math.pow(this.pos.x - pt.x,2) + Math.pow(this.pos.y - pt.y,2);
                if ( d < record ) {
                    record = d;
                    closest = pt;
                }                    
            }
        }
        if ( closest ) {
            ray.closestPoint = closest;
            if ( closest == ray.endpoint) {

                let projResult1 =  Vector.dot( ray.anglePoint.vec1, Vector.perp( ray.dir ) );
                let projResult2 =  Vector.dot( ray.anglePoint.vec2, Vector.perp( ray.dir ) );

               if ( projResult1 * projResult2 <= 0 ){
                    // let ray1 = new Ray(this.pos, ray.anglePoint); 
                    // let ray2 = new Ray(this.pos, ray.anglePoint);
                    let auxRay = new Ray(this.pos, ray.anglePoint)

                    if ( projResult1 < 0 )
                        auxRay.setDir(Matter.Vector.rotate(ray.dir,-0.005));                      
                    else 
                        auxRay.setDir(Matter.Vector.rotate(ray.dir,0.005));
                      
                    this.cornerRays.push(auxRay);

                    // ray1.dir = Vector.mult(ray1.dir,1000);
                    // ray2.dir = Vector.mult(ray2.dir,1000);
                
                    // this.cornerRays.push(ray1, ray2);
              }
              else ;

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
                const d = Math.pow(this.pos.x - pt.x,2) + Math.pow(this.pos.y - pt.y,2);
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
    drawMesh(/*filters*/) {
        this.tris = [];
        let tris = [];
        //delete this.mesh;
        if ( this.mesh)
            this.mesh.destroy({children: true});
        // draw a triangle beween the endpoints & source of every ray
        for ( let i = 1; i < this.rays.length; i++) {
            const triangle = new PIXI.Geometry()
                .addAttribute('aVertexPosition', 
                        [ this.pos.x,  this.pos.y,
                          this.rays[i-1].closestPoint.x, this.rays[i-1].closestPoint.y,
                          this.rays[i].closestPoint.x, this.rays[i].closestPoint.y],
                        2);
            tris.push(triangle);
        }
        // draw an extra triangle to connect the beginning and end of the array
        const firstTri = new PIXI.Geometry()
        .addAttribute('aVertexPosition', 
        [this.pos.x,  this.pos.y,
            this.rays[0].closestPoint.x, this.rays[0].closestPoint.y,
            this.rays[this.rays.length-1].closestPoint.x, 
            this.rays[this.rays.length-1].closestPoint.y],
            2);
        tris.push(firstTri);
        
        const viewShape = PIXI.Geometry.merge(tris);
        
        this.mesh = new PIXI.Mesh( viewShape, this.shader);
        // this.mesh.filters = filters;
        //this.tris.push(this.mesh);
    }
}