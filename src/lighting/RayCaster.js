import Matter from 'matter-js/build/matter.min.js';
import {Ray} from "./ray.js";

let Vector = Matter.Vector;
/**
 * - Performs all ray casts for one light source
 * - Creates necessary auxillary rays
 * - Sorts list of casted rays by angle
 * - Creates & manages WebGL meshes for result
 * @class
 */
export class RayCaster {
    /**
     * - Performs all ray casts for one light source
     * - Creates necessary auxillary rays
     * - Sorts list of casted rays by angle
     * - Creates & manages WebGL meshes for result
     * @param {number} x - x position
     * @param {number} y - y position
     * @param {Boundary[]} segments - terrain edges for ray casting
     * @param {Corner[]} endpoints - terrain vertices for ray casting
     * @param {Object} shaderProgram - WebGL shader text
     * 
     */
    constructor(x, y, segments, endpoints, shaderProgram){
        this.pos = Vector.create(x, y);  // ray source point
        this.rays = []; // all the rays
        this.cornerRays = []; // auxilary rays
        this.endpoints = endpoints;
        this.segments = segments;
        this.tris = [];
        this.mesh;  // webgl mesh
        this.shaderProgram = shaderProgram; 
        this.uColor = [1, 0.831, 0.322]; // color of the light gradient

        // create list of main rays, pointing at each of the endpoints
        for ( let corner of endpoints ) {
            let endpoint = corner.pos;
            let rayDir = Matter.Vector.create(endpoint.x - this.pos.x, endpoint.y - this.pos.y);
            Matter.Vector.normalise(rayDir);
            let newRay = new Ray(this.pos, corner);
            newRay.setDir(rayDir);    
            this.rays.push(newRay);
        }
        this.uniforms = {
            dimensions:    [window.innerWidth, window.innerHeight],
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
                position: [x, y],
                time: time,
                color : this.uColor
              };
        }
        else{
        this.uniforms = {
            dimensions:    [window.innerWidth, window.innerHeight],
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

    // cast all main rays
    look() {
        for ( let ray of this.rays) {
            this.cast(ray);
        }
    }

    // cast an individual main ray, create an auxillary ray if necessary
    cast(ray) {
        let closest = ray.endpoint;
        let record = Math.pow(this.pos.x - closest.x,2) + Math.pow(this.pos.y - closest.y,2);

        // check for intersection with each wall
        for ( let wall of this.segments) {              
            const pt = ray.cast(wall);
            if (pt) {
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
                // Only create an auxillary ray if one of the edges connected to the corner
                // point is hidden:

                // Project(scalar) each edge vector onto a unit vector perpendicular to the
                // main ray
                let projResult1 =  Vector.dot( ray.anglePoint.vec1, Vector.perp( ray.dir ) );
                let projResult2 =  Vector.dot( ray.anglePoint.vec2, Vector.perp( ray.dir ) );

                // If the results of the projections have differing signs, create a new
                // auxillary ray:
                if ( projResult1 * projResult2 <= 0 ){
                    let auxRay = new Ray(this.pos, ray.anglePoint)   

                    if ( projResult1 < 0 ) // rotate clockwise from the main ray
                        auxRay.setDir(Matter.Vector.rotate(ray.dir,-0.005));  

                    else  //  rotate counter clockwise from the main ray  
                        auxRay.setDir(Matter.Vector.rotate(ray.dir,0.005));
                        
                    this.cornerRays.push(auxRay);
                }
            }          
        }
    }

    // cast all auxillary rays, sort the all the rays by angle
    auxLook() {
        for ( let ray of this.cornerRays) {
           ray = this.auxCast(ray);
           this.rays.push(ray);
        }     
        this.rays.sort(this.compare);
    }

    // cast an individual auxillary ray
    auxCast(ray) {
        let closest = null
        let record = Infinity;
        for ( let wall of this.segments) {              
            const pt = ray.cast(wall);
            if (pt) {
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