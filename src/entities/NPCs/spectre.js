import { makeNoise2D } from 'open-simplex-noise';
import { PointLight } from '../../lighting/PointLight.js';
import Matter from 'matter-js/build/matter.min.js';
import {NPC} from './NPC.js'
import { FilterCache } from '../../filters/TextureBuffer.js';
import { Boundary } from '../terrain.js';
import { Corner } from '../../lighting/geometry.js';

let Vector = Matter.Vector;


export class Spectre extends NPC{
    /**
     * @param {Object} options
     * @param {PIXI.Point} options.position - position of lantern joint
     * @param {PIXI.Texture[]} options.textures 
     * @param {PIXI.Container} options.targetContainer 
     * @param {PIXI.Container} options.lightContainer 
     * @param {Boundary[]} options.castSegments 
     * @param {Corner[]} options.endPoints 
     * @param {PIXI.Texture[]} options.torchFrames 
     * @param {Matter.world} options.world - physics world
     * @param {FilterCache} options.filterCache - framebuffer & filter manager
     * @param {Rectangle} options.screen - viewport rectangle
     */
    constructor(options){
        super(options);
        
        this.debugRenderer = new PIXI.Graphics();

        this.noise2D = makeNoise2D(Date.now());
        
        this.frameCount = 0;

        this.MOVE_SPEED = 10;
        this.TIME_INCREMENT = 0.01;  

        this.colliderOffset = Vector.create(80,-40);
        this.colliderPadding = Vector.create(-30, -80);

        this.matterPos = Vector.create(this.position.x, this.position.y);

        this.colliderDimensions = Vector.add(this.colliderPadding, Vector.create(this.idleAnim.width, this.idleAnim.height));

        this.body = Matter.Bodies.rectangle(
            this.position.x + this.colliderOffset.x, 
            this.position.y + this.colliderOffset.y, 
            this.colliderDimensions.x, 
            this.colliderDimensions.y, {
            inertia: Infinity,
            restitution: 0,
            collisionFilter: {
                group: -1,
                mask: 0x0002 | 0x0001
            }
            //isStatic : true,
        });
        this.gravityDir = Vector.create(0,-10);

        this.lantern = new Lantern(
            this.position, 
            options.textures.lantern, 
            this.colliderOffset, 
            options.castSegments, options.endPoints, 
            options.torchFrames);

        this.constraint = Matter.Constraint.create({
            pointA: this.position,
            bodyB: this.lantern.body,
            pointB: {x: 0, y:this.lantern.sprite.height/2  },
            length: 0
        })

        Matter.World.add(options.world, [this.body, this.lantern.body, this.constraint]);

        options.lightContainer.addChild(this.lantern.lightContainer);
        options.targetContainer.addChild(this.animationContainer);
        options.targetContainer.addChild(this.lantern.sprite);
    
        options.targetContainer.addChild(this.debugRenderer);
    }

    update(){
        this.position.set(this.body.position.x - this.colliderOffset.x, this.body.position.y- this.colliderOffset.y);

        this.lantern.update(this.position);

        this.idleAnim.position.copyFrom(this.position);
        this.drawColliders();
    }

    FixedUpdate(){
        this.frameCount+= this.TIME_INCREMENT;
        let xOffset = this.noise2D (this.frameCount, 0) * this.MOVE_SPEED;
        let yOffset = this.noise2D (0,this.frameCount) * this.MOVE_SPEED;

        Matter.Body.setVelocity(this.body, Vector.create(xOffset, yOffset)); 
    }

    drawColliders(){
        // draw spectre collider
        // this.drawRect(this.body.position, this.colliderDimensions, this.idleAnim.rotation)

        // draw lantern collider
        // this.drawRect(this.lightCenter, this.lanternColliderDimensions, this.lanternSprite.rotation);

        // draw light source center
        //this.drawRect(this.lightCenter, Vector.create(10,10), this.lanternSprite.rotation);


    }
    drawRect(position, size, rotation, color){
        if ( !color )
            color = 0xff5252;

        this.debugRenderer.clear();
        this.debugRenderer.position.copyFrom(position);
        this.debugRenderer.beginFill(0xff5252, 0.5 )
        .drawRect(-size.x/2, -size.y/2, size.x, size.y)
        .endFill();
        this.debugRenderer.rotation = rotation;
    }
}

export class Lantern{
    constructor(position, texture, colliderOffset, castSegments, endPoints, torchFrames ){
        this.position = new PIXI.Point(position.x, position.y);
        
        this.debugRenderer = new PIXI.Graphics();

        this.sprite = new PIXI.Sprite.from(texture);
        this.sprite.position.copyFrom(this.position);  
        this.sprite.scale.set(5); 
        this.sprite.anchor.set(0.5,0);

        this.lightCenter = new PIXI.Point();
        this.ROTATION_RADIUS = 50;

        this.lightContainer = new PIXI.Container();

        this.light = new PointLight(this.position.x,this.position.y, castSegments, endPoints, torchFrames);

        this.colliderDimensions = Vector.create(this.sprite.width- 10, this.sprite.height-10 );

        this.body = Matter.Bodies.trapezoid(
            this.position.x + colliderOffset.x, 
            this.position.y + colliderOffset.y,  
            this.colliderDimensions.x, this.colliderDimensions.y,
            -1, {
                fricitonAir: 0.05,
                collisionFilter: {
                    group: -1,
                    mask : 0x0002 | 0x0001
                }
            }
        );
    }

    update(position){
        // translate sprite
        this.position.copyFrom(position);
        this.sprite.position.copyFrom(position);
        this.sprite.rotation = this.body.angle + Math.PI;

        this.lightCenter.set(position.x + this.ROTATION_RADIUS*Math.cos(this.sprite.rotation + Math.PI/2), 
            position.y + this.ROTATION_RADIUS*Math.sin(this.sprite.rotation + Math.PI/2 ));

        this.lightContainer.removeChild(this.light.visionSource.mesh);
        this.light.update(null, this.lightCenter, 1);
        this.lightContainer.addChild(this.light.visionSource.mesh);

    }
}